import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import AcademicYear from "@/models/AcademicYear";
import Material from "@/models/Material";
import StudentProfile from "@/models/StudentProfile";
import User from "@/models/User";
// Diimpor agar model terdaftar sebelum populate() dipanggil
import Class from "@/models/Class";
import Subject from "@/models/Subject";
import Major from "@/models/Major";
import Project from "@/models/Project";
import ProjectSubmission from "@/models/ProjectSubmission";
import Assessment from "@/models/Assessment";
import AssessmentAttempt from "@/models/AssessmentAttempt";
import Question from "@/models/Question";
import { attemptDeadline, SUBMIT_GRACE_MS, toPercent } from "@/lib/assessment";
import { finalizeAttempt, loadQuestions } from "@/lib/assessment-attempt";

// ── Types ─────────────────────────────────────────────────────────────────────

export type StudentSession = {
  id: string;
  name: string;
  email: string;
};

export type StudentMateriItem = {
  _id: string;
  title: string;
  description: string;
  content: string;
  subjectName: string;
  teacherName: string;
  publishedAt: string | null;
};

export type StudentMateriResult = {
  className: string | null;
  academicYearLabel: string | null;
  items: StudentMateriItem[];
};

export type StudentDashboardData = {
  className: string | null;
  majorName: string | null;
  majorAbbreviation: string | null;
  homeroomTeacher: string | null;
  academicYearLabel: string | null;
  materiCount: number;
};

// ── Session ───────────────────────────────────────────────────────────────────

/**
 * Ambil siswa yang sedang login dari session (server-side).
 * - Belum login → /login
 * - Bukan role student → halaman utama
 * - Akun dinonaktifkan/dihapus → /logout (bukan /login, supaya tidak loop dgn proxy)
 *
 * Identitas SELALU dari session, tidak pernah dari input client.
 */
export async function requireStudent(): Promise<StudentSession> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "student") redirect("/");

  await connectDB();
  const user = await User.findById(session.user.id).select("isActive").lean<{ isActive?: boolean }>();
  if (!user || user.isActive === false) redirect("/logout");

  return {
    id: session.user.id,
    name: session.user.name ?? session.user.email ?? "Siswa",
    email: session.user.email ?? "",
  };
}

// ── Materi ────────────────────────────────────────────────────────────────────

/**
 * Materi yang boleh dilihat siswa: HANYA status "published", HANYA untuk
 * kelas milik siswa itu sendiri (dari StudentProfile di DB, bukan dari input
 * client), pada tahun ajaran aktif.
 */
export async function listPublishedMateri(studentUserId: string): Promise<StudentMateriResult> {
  await connectDB();
  void Class;
  void Subject;

  const [profile, activeYear] = await Promise.all([
    StudentProfile.findOne({ user: studentUserId, isActive: { $ne: false } })
      .populate("class", "name")
      .lean<{ class: { _id: unknown; name: string } | null }>(),
    AcademicYear.findOne({ isActive: true }).lean<{ _id: unknown; year: string; semester: string }>(),
  ]);

  const klass = profile?.class ?? null;
  const academicYearLabel = activeYear ? `${activeYear.year} (${activeYear.semester})` : null;

  if (!klass || !activeYear) {
    return { className: klass?.name ?? null, academicYearLabel, items: [] };
  }

  const raw = await Material.find({
    class: klass._id,
    academicYear: activeYear._id,
    status: "published",
  })
    .populate("subject", "name")
    .populate("teacher", "username")
    .sort({ publishedAt: -1, updatedAt: -1 })
    .lean<
      Array<{
        _id: unknown;
        title: string;
        description: string;
        content: string;
        subject: { name: string } | null;
        teacher: { username: string } | null;
        publishedAt?: Date;
      }>
    >();

  return {
    className: klass.name,
    academicYearLabel,
    items: raw.map((m) => ({
      _id: String(m._id),
      title: m.title,
      description: m.description,
      content: m.content,
      subjectName: m.subject?.name ?? "—",
      teacherName: m.teacher?.username ?? "—",
      publishedAt: m.publishedAt ? m.publishedAt.toISOString() : null,
    })),
  };
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

/**
 * Ringkasan dashboard siswa. Identitas kelas/jurusan/wali kelas diambil dari
 * StudentProfile milik siswa itu sendiri, bukan dari input client.
 */
export async function getStudentDashboard(studentUserId: string): Promise<StudentDashboardData> {
  await connectDB();
  void Class;
  void Major;
  void User;

  const [profile, activeYear] = await Promise.all([
    StudentProfile.findOne({ user: studentUserId, isActive: { $ne: false } })
      .populate({
        path: "class",
        select: "name homeroomTeacher",
        populate: { path: "homeroomTeacher", select: "username" },
      })
      .populate("major", "name abbreviation")
      .lean<{
        class: { _id: unknown; name: string; homeroomTeacher?: { username: string } | null } | null;
        major: { name: string; abbreviation: string } | null;
      }>(),
    AcademicYear.findOne({ isActive: true }).lean<{ _id: unknown; year: string; semester: string }>(),
  ]);

  const klass = profile?.class ?? null;
  const materiCount =
    klass && activeYear
      ? await Material.countDocuments({
          class: klass._id,
          academicYear: activeYear._id,
          status: "published",
        })
      : 0;

  return {
    className: klass?.name ?? null,
    majorName: profile?.major?.name ?? null,
    majorAbbreviation: profile?.major?.abbreviation ?? null,
    homeroomTeacher: klass?.homeroomTeacher?.username ?? null,
    academicYearLabel: activeYear ? `${activeYear.year} (${activeYear.semester})` : null,
    materiCount,
  };
}

// ── Project ───────────────────────────────────────────────────────────────────

export type StudentProjectItem = {
  _id: string;
  title: string;
  description: string;
  subjectName: string;
  teacherName: string;
  deadline: string;
  projectStatus: "active" | "closed";
  /** true bila deadline sudah lewat (pengumpulan masih boleh jika project aktif, tapi ditandai terlambat). */
  isPastDeadline: boolean;
  submission: {
    content: string;
    fileUrl: string | null;
    submittedAt: string;
    submissionStatus: "ontime" | "late";
    status: "submitted" | "graded" | "revision";
    grade: number | null;
    feedback: string | null;
  } | null;
};

/**
 * Project untuk kelas siswa ini pada tahun ajaran aktif, beserta pengumpulan
 * miliknya sendiri. Kelas diambil dari StudentProfile di DB, bukan input client.
 */
export async function listStudentProjects(studentUserId: string): Promise<{
  className: string | null;
  items: StudentProjectItem[];
}> {
  await connectDB();
  void Class;
  void Subject;

  const [profile, activeYear] = await Promise.all([
    StudentProfile.findOne({ user: studentUserId, isActive: { $ne: false } })
      .populate("class", "name")
      .lean<{ class: { _id: unknown; name: string } | null }>(),
    AcademicYear.findOne({ isActive: true }).lean<{ _id: unknown }>(),
  ]);

  const klass = profile?.class ?? null;
  if (!klass || !activeYear) return { className: klass?.name ?? null, items: [] };

  const projects = await Project.find({ class: klass._id, academicYear: activeYear._id })
    .populate("subject", "name")
    .populate("teacher", "username")
    .sort({ deadline: 1 })
    .lean<
      Array<{
        _id: unknown;
        title: string;
        description: string;
        subject: { name: string } | null;
        teacher: { username: string } | null;
        deadline: Date;
        status: "active" | "closed";
      }>
    >();

  const submissions = await ProjectSubmission.find({
    student: studentUserId,
    project: { $in: projects.map((p) => p._id) },
  }).lean<
    Array<{
      project: unknown;
      content: string;
      fileUrl?: string;
      submittedAt: Date;
      submissionStatus: "ontime" | "late";
      status: "submitted" | "graded" | "revision";
      grade?: number;
      feedback?: string;
    }>
  >();
  const subByProject = new Map(submissions.map((s) => [String(s.project), s]));
  const now = Date.now();

  return {
    className: klass.name,
    items: projects.map((p) => {
      const s = subByProject.get(String(p._id));
      return {
        _id: String(p._id),
        title: p.title,
        description: p.description,
        subjectName: p.subject?.name ?? "—",
        teacherName: p.teacher?.username ?? "—",
        deadline: p.deadline.toISOString(),
        projectStatus: p.status,
        isPastDeadline: p.deadline.getTime() < now,
        submission: s
          ? {
              content: s.content,
              fileUrl: s.fileUrl ?? null,
              submittedAt: s.submittedAt.toISOString(),
              submissionStatus: s.submissionStatus,
              status: s.status,
              grade: s.grade ?? null,
              feedback: s.feedback ?? null,
            }
          : null,
      };
    }),
  };
}

// ── Assessment ────────────────────────────────────────────────────────────────

export type AssessmentType = "quiz" | "uts" | "uas" | "tugas";

export type StudentAssessmentItem = {
  _id: string;
  title: string;
  description: string;
  type: AssessmentType;
  subjectName: string;
  teacherName: string;
  duration: number;
  questionCount: number;
  startDate: string;
  endDate: string;
  assessmentStatus: "active" | "closed";
  /** none = belum mulai, in-progress = sedang dikerjakan, done = sudah selesai */
  attemptState: "none" | "in-progress" | "done";
  result: { totalScore: number; maxScore: number; percent: number; pendingReview: boolean } | null;
};

/**
 * Jika percobaan masih berjalan tetapi waktunya sudah habis (melewati batas +
 * toleransi), tutup dengan jawaban kosong agar tidak menggantung selamanya.
 * Mengembalikan true bila baru saja ditutup.
 */
async function closeIfExpired(
  attempt: InstanceType<typeof AssessmentAttempt> & { _id: unknown; createdAt?: Date },
  assessment: { _id: unknown; duration: number; endDate: Date },
): Promise<boolean> {
  if (attempt.status !== "in-progress") return false;
  const started = attempt.createdAt ?? new Date();
  const limit = attemptDeadline(started, assessment.duration, assessment.endDate).getTime() + SUBMIT_GRACE_MS;
  if (Date.now() <= limit) return false;
  const questions = await loadQuestions(assessment._id);
  await finalizeAttempt(attempt, questions, {});
  return true;
}

/** Assessment untuk kelas siswa pada tahun ajaran aktif (hanya active/closed; draft disembunyikan). */
export async function listStudentAssessments(studentUserId: string): Promise<{
  className: string | null;
  items: StudentAssessmentItem[];
}> {
  await connectDB();
  void Class;
  void Subject;

  const [profile, activeYear] = await Promise.all([
    StudentProfile.findOne({ user: studentUserId, isActive: { $ne: false } })
      .populate("class", "name")
      .lean<{ class: { _id: unknown; name: string } | null }>(),
    AcademicYear.findOne({ isActive: true }).lean<{ _id: unknown }>(),
  ]);
  const klass = profile?.class ?? null;
  if (!klass || !activeYear) return { className: klass?.name ?? null, items: [] };

  const assessments = await Assessment.find({
    class: klass._id,
    academicYear: activeYear._id,
    status: { $in: ["active", "closed"] },
  })
    .populate("subject", "name")
    .populate("teacher", "username")
    .sort({ endDate: 1 })
    .lean<
      Array<{
        _id: unknown;
        title: string;
        description: string;
        type: AssessmentType;
        subject: { name: string } | null;
        teacher: { username: string } | null;
        duration: number;
        startDate: Date;
        endDate: Date;
        status: "active" | "closed";
      }>
    >();

  const ids = assessments.map((a) => a._id);
  const [attemptDocs, qCounts] = await Promise.all([
    AssessmentAttempt.find({ student: studentUserId, assessment: { $in: ids } }),
    Question.aggregate<{ _id: unknown; n: number }>([
      { $match: { assessment: { $in: ids } } },
      { $group: { _id: "$assessment", n: { $sum: 1 } } },
    ]),
  ]);

  // Tutup percobaan kedaluwarsa sebelum ditampilkan
  const byAssessment = new Map<string, (typeof attemptDocs)[number]>();
  for (const a of attemptDocs) {
    const meta = assessments.find((x) => String(x._id) === String(a.assessment));
    if (meta) await closeIfExpired(a, meta);
    byAssessment.set(String(a.assessment), a);
  }
  const countMap = new Map(qCounts.map((q) => [String(q._id), q.n]));

  return {
    className: klass.name,
    items: assessments.map((a) => {
      const att = byAssessment.get(String(a._id));
      const done = !!att && att.status !== "in-progress";
      return {
        _id: String(a._id),
        title: a.title,
        description: a.description,
        type: a.type,
        subjectName: a.subject?.name ?? "—",
        teacherName: a.teacher?.username ?? "—",
        duration: a.duration,
        questionCount: countMap.get(String(a._id)) ?? 0,
        startDate: a.startDate.toISOString(),
        endDate: a.endDate.toISOString(),
        assessmentStatus: a.status,
        attemptState: !att ? "none" : done ? "done" : "in-progress",
        result:
          att && done
            ? {
                totalScore: att.totalScore,
                maxScore: att.maxScore,
                percent: toPercent(att.totalScore, att.maxScore),
                pendingReview: att.status === "needs_manual_review",
              }
            : null,
      };
    }),
  };
}

/** Soal untuk siswa — TANPA kunci jawaban. */
export type TakeQuestion = {
  _id: string;
  questionType: "multiple-choice" | "essay" | "true-false";
  questionText: string;
  options: { label: string; text: string }[];
  points: number;
};

export type TakeAssessmentData = {
  assessment: {
    _id: string;
    title: string;
    description: string;
    type: AssessmentType;
    subjectName: string;
    teacherName: string;
    duration: number;
    startDate: string;
    endDate: string;
    status: "active" | "closed";
    questionCount: number;
    totalPoints: number;
  };
  state: "not-started" | "in-progress" | "done";
  /** Alasan belum bisa memulai (mis. belum dibuka / sudah ditutup); null bila boleh. */
  cannotStartReason: string | null;
  /** Batas waktu pengumpulan (ISO) — hanya saat in-progress. */
  deadline: string | null;
  /** Soal tanpa kunci — hanya saat in-progress. */
  questions: TakeQuestion[];
  result: { totalScore: number; maxScore: number; percent: number; pendingReview: boolean } | null;
};

/**
 * Data halaman pengerjaan. Mengembalikan null bila assessment tidak ada, bukan
 * untuk kelas siswa ini, atau masih draft (jangan bocorkan keberadaannya).
 */
export async function getAssessmentForTaking(
  studentUserId: string,
  assessmentId: string,
): Promise<TakeAssessmentData | null> {
  if (!/^[a-f\d]{24}$/i.test(assessmentId)) return null;
  await connectDB();
  void Class;
  void Subject;

  const [profile, activeYear] = await Promise.all([
    StudentProfile.findOne({ user: studentUserId, isActive: { $ne: false } }).lean<{ class: unknown }>(),
    AcademicYear.findOne({ isActive: true }).lean<{ _id: unknown }>(),
  ]);
  if (!profile || !activeYear) return null;

  const a = await Assessment.findOne({
    _id: assessmentId,
    class: profile.class,
    academicYear: activeYear._id,
    status: { $in: ["active", "closed"] },
  })
    .populate("subject", "name")
    .populate("teacher", "username")
    .lean<{
      _id: unknown;
      title: string;
      description: string;
      type: AssessmentType;
      subject: { name: string } | null;
      teacher: { username: string } | null;
      duration: number;
      startDate: Date;
      endDate: Date;
      status: "active" | "closed";
    }>();
  if (!a) return null;

  const questions = await loadQuestions(a._id);
  const attempt = await AssessmentAttempt.findOne({ assessment: a._id, student: studentUserId });
  if (attempt) await closeIfExpired(attempt, a);

  const meta = {
    _id: String(a._id),
    title: a.title,
    description: a.description,
    type: a.type,
    subjectName: a.subject?.name ?? "—",
    teacherName: a.teacher?.username ?? "—",
    duration: a.duration,
    startDate: a.startDate.toISOString(),
    endDate: a.endDate.toISOString(),
    status: a.status,
    questionCount: questions.length,
    totalPoints: questions.reduce((s, q) => s + q.points, 0),
  };

  if (attempt && attempt.status !== "in-progress") {
    return {
      assessment: meta,
      state: "done",
      cannotStartReason: null,
      deadline: null,
      questions: [],
      result: {
        totalScore: attempt.totalScore,
        maxScore: attempt.maxScore,
        percent: toPercent(attempt.totalScore, attempt.maxScore),
        pendingReview: attempt.status === "needs_manual_review",
      },
    };
  }

  if (attempt) {
    const deadline = attemptDeadline(attempt.createdAt, a.duration, a.endDate);
    return {
      assessment: meta,
      state: "in-progress",
      cannotStartReason: null,
      deadline: deadline.toISOString(),
      questions: questions.map((q) => ({
        _id: String(q._id),
        questionType: q.questionType,
        questionText: q.questionText,
        options: q.options.map((o) => ({ label: o.label, text: o.text })),
        points: q.points,
      })),
      result: null,
    };
  }

  const now = Date.now();
  let cannotStartReason: string | null = null;
  if (a.status !== "active" || now > a.endDate.getTime()) cannotStartReason = "Assessment ini sudah ditutup.";
  else if (now < a.startDate.getTime()) cannotStartReason = "Assessment ini belum dibuka.";
  else if (questions.length === 0) cannotStartReason = "Assessment ini belum memiliki soal.";

  return { assessment: meta, state: "not-started", cannotStartReason, deadline: null, questions: [], result: null };
}
