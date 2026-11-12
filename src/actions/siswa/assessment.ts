"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { attemptDeadline, SUBMIT_GRACE_MS } from "@/lib/assessment";
import { finalizeAttempt, loadQuestions } from "@/lib/assessment-attempt";
import { connectDB } from "@/lib/mongodb";
import AcademicYear from "@/models/AcademicYear";
import Assessment from "@/models/Assessment";
import AssessmentAttempt from "@/models/AssessmentAttempt";
import StudentProfile from "@/models/StudentProfile";
import User from "@/models/User";

export type AssessmentActionState = { error?: string; success?: boolean };

const objectIdRegex = /^[a-f\d]{24}$/i;
const NOT_STUDENT = "Sesi tidak valid. Silakan login ulang sebagai siswa.";

async function getStudentFromSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "student") return null;
  await connectDB();
  const user = await User.findById(session.user.id).select("isActive").lean<{ isActive?: boolean }>();
  if (!user || user.isActive === false) return null;
  return { id: session.user.id };
}

/** Assessment harus milik KELAS siswa ini pada tahun ajaran aktif. */
async function findOwnAssessment(studentId: string, assessmentId: string) {
  const [profile, activeYear] = await Promise.all([
    StudentProfile.findOne({ user: studentId, isActive: { $ne: false } }).lean<{ class: unknown }>(),
    AcademicYear.findOne({ isActive: true }).lean<{ _id: unknown }>(),
  ]);
  if (!profile || !activeYear) return null;
  return Assessment.findOne({
    _id: assessmentId,
    class: profile.class,
    academicYear: activeYear._id,
  }).lean<{
    _id: unknown;
    status: "draft" | "active" | "closed";
    duration: number;
    startDate: Date;
    endDate: Date;
  }>();
}

/**
 * Mulai mengerjakan. Hanya sekali per siswa (unique index), hanya saat status
 * "active" dan di dalam jendela startDate..endDate. Waktu mulai = createdAt
 * attempt (dicatat server, tidak bisa dimanipulasi client).
 */
export async function startAttempt(assessmentId: string): Promise<AssessmentActionState> {
  const student = await getStudentFromSession();
  if (!student) return { error: NOT_STUDENT };
  if (!objectIdRegex.test(assessmentId)) return { error: "Assessment tidak ditemukan." };

  try {
    const assessment = await findOwnAssessment(student.id, assessmentId);
    if (!assessment || assessment.status === "draft") return { error: "Assessment tidak ditemukan." };

    const existing = await AssessmentAttempt.findOne({ assessment: assessmentId, student: student.id }).select("_id");
    if (existing) {
      revalidatePath(`/siswa/assessment/${assessmentId}`);
      return { success: true }; // sudah mulai — lanjutkan saja
    }

    const now = Date.now();
    if (assessment.status !== "active" || now > assessment.endDate.getTime()) {
      return { error: "Assessment ini sudah ditutup." };
    }
    if (now < assessment.startDate.getTime()) return { error: "Assessment ini belum dibuka." };

    const questions = await loadQuestions(assessment._id);
    if (questions.length === 0) return { error: "Assessment ini belum memiliki soal." };

    try {
      await AssessmentAttempt.create({
        assessment: assessmentId,
        student: student.id,
        maxScore: questions.reduce((s, q) => s + q.points, 0),
        status: "in-progress",
      });
    } catch (err) {
      // Klik ganda / race: unique index menolak percobaan kedua — anggap sudah mulai
      if ((err as { code?: number }).code !== 11000) throw err;
    }
  } catch {
    return { error: "Gagal memulai assessment. Coba lagi." };
  }

  revalidatePath(`/siswa/assessment/${assessmentId}`);
  revalidatePath("/siswa/assessment");
  return { success: true };
}

/**
 * Kumpulkan jawaban. Field form: `q_<questionId>`. Penilaian dilakukan di
 * server dari kunci di DB. Jika waktu sudah habis (di luar toleransi), jawaban
 * ditolak dan percobaan ditutup dengan nilai dari jawaban kosong.
 */
export async function submitAttempt(
  assessmentId: string,
  _prev: AssessmentActionState,
  formData: FormData,
): Promise<AssessmentActionState> {
  const student = await getStudentFromSession();
  if (!student) return { error: NOT_STUDENT };
  if (!objectIdRegex.test(assessmentId)) return { error: "Assessment tidak ditemukan." };

  try {
    const assessment = await findOwnAssessment(student.id, assessmentId);
    if (!assessment || assessment.status === "draft") return { error: "Assessment tidak ditemukan." };

    const attempt = await AssessmentAttempt.findOne({ assessment: assessmentId, student: student.id });
    if (!attempt) return { error: "Anda belum memulai assessment ini." };
    if (attempt.status !== "in-progress") return { error: "Anda sudah mengumpulkan assessment ini." };

    const questions = await loadQuestions(assessment._id);
    const limit =
      attemptDeadline(attempt.createdAt, assessment.duration, assessment.endDate).getTime() + SUBMIT_GRACE_MS;

    if (Date.now() > limit) {
      await finalizeAttempt(attempt, questions, {});
      revalidatePath(`/siswa/assessment/${assessmentId}`);
      revalidatePath("/siswa/assessment");
      return { error: "Waktu pengerjaan sudah habis. Jawaban tidak dapat diterima." };
    }

    const answers: Record<string, string> = {};
    for (const q of questions) {
      const v = formData.get(`q_${String(q._id)}`);
      if (typeof v === "string") answers[String(q._id)] = v.slice(0, 10000);
    }
    await finalizeAttempt(attempt, questions, answers);
  } catch {
    return { error: "Gagal mengumpulkan jawaban. Coba lagi." };
  }

  revalidatePath(`/siswa/assessment/${assessmentId}`);
  revalidatePath("/siswa/assessment");
  revalidatePath("/guru/assessment");
  return { success: true };
}
