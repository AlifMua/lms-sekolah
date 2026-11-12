import { connectDB } from "@/lib/mongodb";
import { average, finalGrade } from "@/lib/grades";
import { toPercent } from "@/lib/assessment";
import Assessment from "@/models/Assessment";
import AssessmentAttempt from "@/models/AssessmentAttempt";
import Project from "@/models/Project";
import ProjectSubmission from "@/models/ProjectSubmission";
import StudentProfile from "@/models/StudentProfile";
// Diimpor agar model terdaftar sebelum populate() dipanggil
import "@/models/User";

export type GradebookRow = {
  nis: string;
  studentName: string;
  assessmentAvg: number | null;
  projectAvg: number | null;
  finalGrade: number | null;
};

export type GradebookGroup = {
  assignmentId: string;
  className: string;
  subjectName: string;
  assessmentCount: number;
  projectCount: number;
  rows: GradebookRow[];
};

type Assignment = {
  id: string;
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
};

/**
 * Buku nilai guru: per penugasan (mapel × kelas), nilai tiap siswa aktif.
 * Hanya mencakup assessment & project MILIK guru ini pada tahun ajaran aktif,
 * dan hanya pekerjaan yang sudah dinilai.
 */
export async function getTeacherGradebook(
  teacherId: string,
  academicYearId: string,
  assignments: Assignment[],
): Promise<GradebookGroup[]> {
  if (assignments.length === 0) return [];
  await connectDB();

  const [assessments, projects, profiles] = await Promise.all([
    Assessment.find({ teacher: teacherId, academicYear: academicYearId })
      .select("subject class")
      .lean<Array<{ _id: unknown; subject: unknown; class: unknown }>>(),
    Project.find({ teacher: teacherId, academicYear: academicYearId })
      .select("subject class")
      .lean<Array<{ _id: unknown; subject: unknown; class: unknown }>>(),
    StudentProfile.find({
      class: { $in: [...new Set(assignments.map((a) => a.classId))] },
      isActive: { $ne: false },
    })
      .populate("user", "username")
      .lean<Array<{ nis: string; class: unknown; user: { _id: unknown; username: string } | null }>>(),
  ]);

  const [attempts, submissions] = await Promise.all([
    AssessmentAttempt.find({ assessment: { $in: assessments.map((a) => a._id) }, status: "graded" })
      .select("assessment student totalScore maxScore")
      .lean<Array<{ assessment: unknown; student: unknown; totalScore: number; maxScore: number }>>(),
    ProjectSubmission.find({ project: { $in: projects.map((p) => p._id) }, status: "graded" })
      .select("project student grade")
      .lean<Array<{ project: unknown; student: unknown; grade?: number }>>(),
  ]);

  return assignments.map((asg) => {
    const match = (x: { subject: unknown; class: unknown }) =>
      String(x.subject) === asg.subjectId && String(x.class) === asg.classId;
    const aIds = new Set(assessments.filter(match).map((a) => String(a._id)));
    const pIds = new Set(projects.filter(match).map((p) => String(p._id)));

    const rows: GradebookRow[] = profiles
      .filter((p) => p.user && String(p.class) === asg.classId)
      .map((p) => {
        const uid = String(p.user!._id);
        const aScores = attempts
          .filter((t) => String(t.student) === uid && aIds.has(String(t.assessment)))
          .map((t) => toPercent(t.totalScore, t.maxScore));
        const pScores = submissions
          .filter((s) => String(s.student) === uid && pIds.has(String(s.project)) && typeof s.grade === "number")
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
      assignmentId: asg.id,
      className: asg.className,
      subjectName: asg.subjectName,
      assessmentCount: aIds.size,
      projectCount: pIds.size,
      rows,
    };
  });
}
