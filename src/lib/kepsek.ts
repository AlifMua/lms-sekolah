import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Types } from "mongoose";

import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import AcademicYear from "@/models/AcademicYear";
import Class from "@/models/Class";
import Major from "@/models/Major";
import StudentProfile from "@/models/StudentProfile";
import TeacherProfile from "@/models/TeacherProfile";
import TeachingAssignment from "@/models/TeachingAssignment";
import Material from "@/models/Material";
import Assessment from "@/models/Assessment";
import AssessmentAttempt from "@/models/AssessmentAttempt";
import Project from "@/models/Project";
import ProjectSubmission from "@/models/ProjectSubmission";
import User from "@/models/User";
import Subject from "@/models/Subject";
import { average, finalGrade } from "@/lib/grades";
import { toPercent } from "@/lib/assessment";

// ── Session ───────────────────────────────────────────────────────────────────

export type PrincipalSession = {
  id: string;
  name: string;
  email: string;
};

export async function requirePrincipal(): Promise<PrincipalSession> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "principal") redirect("/");

  await connectDB();
  const user = await User.findById(session.user.id)
    .select("isActive")
    .lean<{ isActive?: boolean }>();
  if (!user || user.isActive === false) redirect("/logout");

  return {
    id: session.user.id,
    name: session.user.name ?? session.user.email ?? "Kepala Sekolah",
    email: session.user.email ?? "",
  };
}

// ── Dashboard Stats ───────────────────────────────────────────────────────────

export type KepsekDashboardStats = {
  totalSiswaAktif: number;
  totalGuruAktif: number;
  totalKelas: number;
  totalJurusan: number;
  tahunAjaranAktif: { id: string; year: string; semester: string } | null;
  materiDiterbitkan: number;
  assessmentAktif: number;
  projectAktif: number;
};

export type JurusanStat = {
  id: string;
  name: string;
  abbreviation: string;
  totalSiswa: number;
  avgFinalGrade: number | null;
};

export async function getKepsekDashboardStats(): Promise<KepsekDashboardStats> {
  await connectDB();
  void Subject;
  void TeacherProfile;

  const [
    totalSiswaAktif,
    totalGuruAktif,
    totalKelas,
    totalJurusan,
    activeYear,
  ] = await Promise.all([
    StudentProfile.countDocuments({ isActive: { $ne: false } }),
    User.countDocuments({ role: "teacher", isActive: { $ne: false } }),
    Class.countDocuments({}),
    Major.countDocuments({}),
    AcademicYear.findOne({ isActive: true }).lean<{
      _id: unknown;
      year: string;
      semester: string;
    }>(),
  ]);

  if (!activeYear) {
    return {
      totalSiswaAktif,
      totalGuruAktif,
      totalKelas,
      totalJurusan,
      tahunAjaranAktif: null,
      materiDiterbitkan: 0,
      assessmentAktif: 0,
      projectAktif: 0,
    };
  }

  const [materiDiterbitkan, assessmentAktif, projectAktif] = await Promise.all([
    Material.countDocuments({ academicYear: activeYear._id, status: "published" }),
    Assessment.countDocuments({ academicYear: activeYear._id, status: "active" }),
    Project.countDocuments({ academicYear: activeYear._id, status: "active" }),
  ]);

  return {
    totalSiswaAktif,
    totalGuruAktif,
    totalKelas,
    totalJurusan,
    tahunAjaranAktif: {
      id: String(activeYear._id),
      year: activeYear.year,
      semester: activeYear.semester,
    },
    materiDiterbitkan,
    assessmentAktif,
    projectAktif,
  };
}

export async function getJurusanStats(): Promise<JurusanStat[]> {
  await connectDB();
  void Subject;
  void Class;
  void User;

  const [majors, activeYear] = await Promise.all([
    Major.find({})
      .sort({ abbreviation: 1 })
      .lean<Array<{ _id: unknown; name: string; abbreviation: string }>>(),
    AcademicYear.findOne({ isActive: true }).lean<{ _id: unknown }>(),
  ]);

  if (!activeYear || majors.length === 0) {
    return majors.map((m) => ({
      id: String(m._id),
      name: m.name,
      abbreviation: m.abbreviation,
      totalSiswa: 0,
      avgFinalGrade: null,
    }));
  }

  // Hitung siswa aktif per jurusan
  const siswaAgg = await StudentProfile.aggregate<{ _id: unknown; n: number }>([
    { $match: { isActive: { $ne: false } } },
    { $group: { _id: "$major", n: { $sum: 1 } } },
  ]);
  const siswaByMajor = new Map(siswaAgg.map((s) => [String(s._id), s.n]));

  // Ambil nilai akhir per jurusan (jika ada data assessment/project)
  const classes = await Class.find({})
    .lean<Array<{ _id: unknown; major: unknown }>>()
    .select("major");
  const classesByMajor = new Map<string, string[]>();
  for (const c of classes) {
    const majorId = String(c.major);
    if (!classesByMajor.has(majorId)) classesByMajor.set(majorId, []);
    classesByMajor.get(majorId)!.push(String(c._id));
  }

  // Ambil semua graded attempts dan submissions untuk tahun aktif
  const [assessments, projects] = await Promise.all([
    Assessment.find({ academicYear: activeYear._id })
      .select("class")
      .lean<Array<{ _id: unknown; class: unknown }>>(),
    Project.find({ academicYear: activeYear._id })
      .select("class")
      .lean<Array<{ _id: unknown; class: unknown }>>(),
  ]);

  const [attempts, submissions] = await Promise.all([
    AssessmentAttempt.find({
      assessment: { $in: assessments.map((a) => a._id) },
      status: "graded",
    })
      .select("assessment student totalScore maxScore")
      .lean<Array<{ assessment: unknown; student: unknown; totalScore: number; maxScore: number }>>(),
    ProjectSubmission.find({
      project: { $in: projects.map((p) => p._id) },
      status: "graded",
    })
      .select("project student grade")
      .lean<Array<{ project: unknown; student: unknown; grade?: number }>>(),
  ]);

  const assessByClass = new Map<string, typeof assessments[number][]>();
  for (const a of assessments) {
    const cId = String(a.class);
    if (!assessByClass.has(cId)) assessByClass.set(cId, []);
    assessByClass.get(cId)!.push(a);
  }
  const projectByClass = new Map<string, typeof projects[number][]>();
  for (const p of projects) {
    const cId = String(p.class);
    if (!projectByClass.has(cId)) projectByClass.set(cId, []);
    projectByClass.get(cId)!.push(p);
  }

  return majors.map((m) => {
    const majorId = String(m._id);
    const classIds = classesByMajor.get(majorId) ?? [];

    // Kumpulkan semua attempt/submission dari kelas jurusan ini
    const aIds = new Set<string>(
      classIds.flatMap((cId) => (assessByClass.get(cId) ?? []).map((a) => String(a._id))),
    );
    const pIds = new Set<string>(
      classIds.flatMap((cId) => (projectByClass.get(cId) ?? []).map((p) => String(p._id))),
    );

    // Group per student: ambil rata-rata assessment + project → finalGrade
    const byStudent = new Map<
      string,
      { aScores: number[]; pScores: number[] }
    >();
    for (const att of attempts) {
      if (!aIds.has(String(att.assessment))) continue;
      const uid = String(att.student);
      if (!byStudent.has(uid)) byStudent.set(uid, { aScores: [], pScores: [] });
      byStudent.get(uid)!.aScores.push(toPercent(att.totalScore, att.maxScore));
    }
    for (const sub of submissions) {
      if (!pIds.has(String(sub.project)) || typeof sub.grade !== "number") continue;
      const uid = String(sub.student);
      if (!byStudent.has(uid)) byStudent.set(uid, { aScores: [], pScores: [] });
      byStudent.get(uid)!.pScores.push(sub.grade);
    }

    const finalGrades: number[] = [];
    for (const { aScores, pScores } of byStudent.values()) {
      const fg = finalGrade(average(aScores), average(pScores));
      if (fg !== null) finalGrades.push(fg);
    }

    return {
      id: majorId,
      name: m.name,
      abbreviation: m.abbreviation,
      totalSiswa: siswaByMajor.get(majorId) ?? 0,
      avgFinalGrade: finalGrades.length > 0 ? Math.round(average(finalGrades) ?? 0) : null,
    };
  });
}

// ── Rekap Nilai ───────────────────────────────────────────────────────────────

export type KepsekGradebookRow = {
  nis: string;
  studentName: string;
  assessmentAvg: number | null;
  projectAvg: number | null;
  finalGrade: number | null;
};

export type KepsekGradebookGroup = {
  classId: string;
  className: string;
  majorName: string;
  subjectName: string;
  teacherName: string;
  rows: KepsekGradebookRow[];
};

export async function getKepsekGradebook(): Promise<KepsekGradebookGroup[]> {
  await connectDB();
  void Subject;
  void Class;
  void User;
  void Major;

  const activeYear = await AcademicYear.findOne({ isActive: true }).lean<{ _id: unknown }>()
  if (!activeYear) return [];

  // Ambil semua penugasan mengajar pada tahun aktif
  const assignments = await TeachingAssignment.find({ academicYear: activeYear._id })
    .populate("teacher", "username")
    .populate("subject", "name")
    .populate("class", "name major")
    .lean<
      Array<{
        _id: unknown;
        teacher: { username: string } | null;
        subject: { name: string } | null;
        class: { _id: unknown; name: string; major: unknown } | null;
        academicYear: unknown;
      }>
    >();

  if (assignments.length === 0) return [];

  const classIds = [...new Set(assignments.map((a) => String(a.class?._id)))];
  const majorIds = [
    ...new Set(
      assignments
        .map((a) => a.class)
        .filter(Boolean)
        .map((c) => String((c as { major: unknown }).major)),
    ),
  ];

  const [profiles, majors, assessments, projects] = await Promise.all([
    StudentProfile.find({ class: { $in: classIds }, isActive: { $ne: false } })
      .populate("user", "username")
      .lean<
        Array<{ nis: string; class: unknown; user: { _id: unknown; username: string } | null }>
      >(),
    Major.find({ _id: { $in: majorIds } })
      .lean<Array<{ _id: unknown; name: string }>>(),
    Assessment.find({ academicYear: activeYear._id })
      .select("subject class")
      .lean<Array<{ _id: unknown; subject: unknown; class: unknown }>>(),
    Project.find({ academicYear: activeYear._id })
      .select("subject class")
      .lean<Array<{ _id: unknown; subject: unknown; class: unknown }>>(),
  ]);

  const majorMap = new Map(majors.map((m) => [String(m._id), m.name]));

  const [attempts, submissions] = await Promise.all([
    AssessmentAttempt.find({
      assessment: { $in: assessments.map((a) => a._id) },
      status: "graded",
    })
      .select("assessment student totalScore maxScore")
      .lean<
        Array<{ assessment: unknown; student: unknown; totalScore: number; maxScore: number }>
      >(),
    ProjectSubmission.find({
      project: { $in: projects.map((p) => p._id) },
      status: "graded",
    })
      .select("project student grade")
      .lean<Array<{ project: unknown; student: unknown; grade?: number }>>(),
  ]);

  return assignments
    .filter((a) => a.teacher && a.subject && a.class)
    .map((asg) => {
      const subjectId = String(asg.subject!);
      const classId = String(asg.class!._id);
      const classObj = asg.class as { _id: unknown; name: string; major: unknown };

      const match = (x: { subject: unknown; class: unknown }) =>
        String(x.subject) === subjectId && String(x.class) === classId;
      const aIds = new Set(assessments.filter(match).map((a) => String(a._id)));
      const pIds = new Set(projects.filter(match).map((p) => String(p._id)));

      const rows: KepsekGradebookRow[] = profiles
        .filter((p) => p.user && String(p.class) === classId)
        .map((p) => {
          const uid = String(p.user!._id);
          const aScores = attempts
            .filter((t) => String(t.student) === uid && aIds.has(String(t.assessment)))
            .map((t) => toPercent(t.totalScore, t.maxScore));
          const pScores = submissions
            .filter(
              (s) =>
                String(s.student) === uid &&
                pIds.has(String(s.project)) &&
                typeof s.grade === "number",
            )
            .map((s) => s.grade as number);
          const assessmentAvg = average(aScores);
          const projectAvg = average(pScores);
          return {
            nis: p.nis,
            studentName: p.user!.username,
            assessmentAvg,
            projectAvg,
            finalGrade: finalGrade(assessmentAvg, projectAvg),
          };
        })
        .sort((a, b) => a.studentName.localeCompare(b.studentName));

      return {
        classId,
        className: classObj.name,
        majorName: majorMap.get(String(classObj.major)) ?? "—",
        subjectName: (asg.subject as { name: string }).name,
        teacherName: asg.teacher!.username,
        rows,
      };
    })
    .sort((a, b) =>
      a.className.localeCompare(b.className) || a.subjectName.localeCompare(b.subjectName),
    );
}

// ── Monitoring Guru ───────────────────────────────────────────────────────────

export type GuruBebanItem = {
  teacherId: string;
  teacherName: string;
  assignments: { className: string; subjectName: string }[];
  materiCount: number;
};

export async function getGuruBebanMengajar(): Promise<GuruBebanItem[]> {
  await connectDB();
  void Subject;
  void Class;
  void User;

  const activeYear = await AcademicYear.findOne({ isActive: true }).lean<{ _id: unknown }>();
  if (!activeYear) return [];

  const assignments = await TeachingAssignment.find({ academicYear: activeYear._id })
    .populate("teacher", "username")
    .populate("subject", "name")
    .populate("class", "name")
    .lean<
      Array<{
        _id: unknown;
        teacher: { _id: unknown; username: string } | null;
        subject: { name: string } | null;
        class: { name: string } | null;
      }>
    >();

  // Kelompokkan per guru
  const byTeacher = new Map<
    string,
    { teacherName: string; assignments: { className: string; subjectName: string }[] }
  >();

  for (const a of assignments) {
    if (!a.teacher || !a.subject || !a.class) continue;
    const tid = String(a.teacher._id);
    if (!byTeacher.has(tid)) {
      byTeacher.set(tid, { teacherName: a.teacher.username, assignments: [] });
    }
    byTeacher.get(tid)!.assignments.push({
      className: a.class.name,
      subjectName: a.subject.name,
    });
  }

  // Hitung materi yang diterbitkan per guru pada tahun aktif
  const teacherIds = [...byTeacher.keys()];
  const materiAgg = await Material.aggregate<{ _id: unknown; n: number }>([
    {
      $match: {
        teacher: { $in: teacherIds.map((id) => new Types.ObjectId(id)) },
        academicYear: activeYear._id,
        status: "published",
      },
    },
    { $group: { _id: "$teacher", n: { $sum: 1 } } },
  ]);
  const materiByTeacher = new Map(materiAgg.map((m) => [String(m._id), m.n]));

  return [...byTeacher.entries()]
    .map(([teacherId, data]) => ({
      teacherId,
      teacherName: data.teacherName,
      assignments: data.assignments.sort(
        (a, b) => a.className.localeCompare(b.className) || a.subjectName.localeCompare(b.subjectName),
      ),
      materiCount: materiByTeacher.get(teacherId) ?? 0,
    }))
    .sort((a, b) => a.teacherName.localeCompare(b.teacherName));
}

