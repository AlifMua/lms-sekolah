"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { connectDB } from "@/lib/mongodb";
import { parseLocalDateTime } from "@/lib/datetime";
import { getTeacherFromSession, getTeacherScope } from "@/lib/teacher";
import Assessment from "@/models/Assessment";
import AssessmentAttempt from "@/models/AssessmentAttempt";
import Question from "@/models/Question";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AssessmentFormValues = {
  title: string;
  description: string;
  assignmentId: string;
  type: string;
  duration: string;
  startDate: string;
  endDate: string;
  status: string;
};

export type AssessmentFormState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof AssessmentFormValues, string[]>>;
  values?: AssessmentFormValues;
  success?: boolean;
};

export type AssessmentActionResult = { error?: string; success?: boolean };

const objectIdRegex = /^[a-f\d]{24}$/i;
const NOT_TEACHER = "Sesi tidak valid. Silakan login ulang sebagai guru.";

// ── Schema ────────────────────────────────────────────────────────────────────

const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Tanggal wajib diisi");

const assessmentSchema = z.object({
  title: z.string().trim().min(3, "Judul minimal 3 karakter").max(150, "Judul maksimal 150 karakter"),
  description: z.string().trim().min(3, "Deskripsi minimal 3 karakter").max(2000, "Deskripsi maksimal 2.000 karakter"),
  assignmentId: z.string().regex(objectIdRegex, "Pilih mapel & kelas"),
  type: z.enum(["quiz", "uts", "uas", "tugas"], { message: "Jenis tidak valid" }),
  duration: z.coerce
    .number({ message: "Durasi harus berupa angka" })
    .int("Durasi harus bilangan bulat")
    .min(1, "Durasi minimal 1 menit")
    .max(600, "Durasi maksimal 600 menit"),
  startDate: localDateTime,
  endDate: localDateTime,
  status: z.enum(["draft", "active", "closed"], { message: "Status tidak valid" }),
});

function readValues(formData: FormData): AssessmentFormValues {
  const str = (key: string) => {
    const v = formData.get(key);
    return typeof v === "string" ? v : "";
  };
  return {
    title: str("title"),
    description: str("description"),
    assignmentId: str("assignmentId"),
    type: str("type"),
    duration: str("duration"),
    startDate: str("startDate"),
    endDate: str("endDate"),
    status: str("status"),
  };
}

/** Penjaga otorisasi: guru hanya boleh membuat assessment untuk mapel+kelas yang ditugaskan. */
async function resolveAssignment(teacherId: string, assignmentId: string) {
  const scope = await getTeacherScope(teacherId);
  if (!scope.academicYear) {
    return { error: "Belum ada tahun ajaran aktif. Hubungi admin." } as const;
  }
  const assignment = scope.assignments.find((a) => a.id === assignmentId);
  if (!assignment) {
    return {
      error: "Anda tidak ditugaskan mengajar mapel & kelas tersebut pada tahun ajaran aktif.",
    } as const;
  }
  return { assignment, academicYearId: scope.academicYear.id } as const;
}

function revalidateAll(assessmentId?: string) {
  revalidatePath("/guru/assessment");
  if (assessmentId) revalidatePath(`/guru/assessment/${assessmentId}`);
  revalidatePath("/siswa/assessment");
}

// ── Assessment CRUD ───────────────────────────────────────────────────────────

type ParsedAssessment = z.infer<typeof assessmentSchema>;

function checkDates(
  data: ParsedAssessment,
  formData: FormData,
): { fieldErrors: Partial<Record<keyof AssessmentFormValues, string[]>> } | { startDate: Date; endDate: Date } {
  const tz = formData.get("tzOffset");
  const startDate = parseLocalDateTime(data.startDate, tz);
  const endDate = parseLocalDateTime(data.endDate, tz);
  if (!startDate) return { fieldErrors: { startDate: ["Tanggal mulai tidak valid"] } };
  if (!endDate) return { fieldErrors: { endDate: ["Tanggal selesai tidak valid"] } };
  if (endDate <= startDate) {
    return { fieldErrors: { endDate: ["Tanggal selesai harus setelah tanggal mulai"] } };
  }
  return { startDate, endDate };
}

export async function createAssessment(
  _prev: AssessmentFormState,
  formData: FormData,
): Promise<AssessmentFormState> {
  const teacher = await getTeacherFromSession();
  if (!teacher) return { error: NOT_TEACHER };

  const values = readValues(formData);
  const parsed = assessmentSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, values };
  const data = parsed.data;

  const dates = checkDates(data, formData);
  if ("fieldErrors" in dates) return { fieldErrors: dates.fieldErrors, values };

  try {
    const resolved = await resolveAssignment(teacher.id, data.assignmentId);
    if ("error" in resolved) return { error: resolved.error, values };

    // Assessment baru tidak boleh langsung aktif tanpa soal — aktifkan setelah soal dibuat
    if (data.status === "active") {
      return { fieldErrors: { status: ["Simpan sebagai Draft dulu, tambahkan soal, lalu aktifkan."] }, values };
    }

    await Assessment.create({
      title: data.title,
      description: data.description,
      subject: resolved.assignment.subjectId,
      class: resolved.assignment.classId,
      teacher: teacher.id,
      academicYear: resolved.academicYearId,
      type: data.type,
      duration: data.duration,
      startDate: dates.startDate,
      endDate: dates.endDate,
      status: data.status,
    });
  } catch {
    return { error: "Gagal menyimpan assessment. Coba lagi.", values };
  }

  revalidateAll();
  return { success: true };
}

export async function updateAssessment(
  id: string,
  _prev: AssessmentFormState,
  formData: FormData,
): Promise<AssessmentFormState> {
  const teacher = await getTeacherFromSession();
  if (!teacher) return { error: NOT_TEACHER };
  if (!objectIdRegex.test(id)) return { error: "Assessment tidak ditemukan." };

  const values = readValues(formData);
  const parsed = assessmentSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, values };
  const data = parsed.data;

  const dates = checkDates(data, formData);
  if ("fieldErrors" in dates) return { fieldErrors: dates.fieldErrors, values };

  try {
    const resolved = await resolveAssignment(teacher.id, data.assignmentId);
    if ("error" in resolved) return { error: resolved.error, values };

    await connectDB();
    // Filter teacher: guru hanya bisa mengubah assessment miliknya sendiri
    const assessment = await Assessment.findOne({ _id: id, teacher: teacher.id });
    if (!assessment) return { error: "Assessment tidak ditemukan.", values };

    const attemptCount = await AssessmentAttempt.countDocuments({ assessment: id });
    if (attemptCount > 0) {
      // Setelah ada yang mengerjakan, mapel/kelas/durasi dikunci agar nilai tetap adil
      const sameTarget =
        String(assessment.subject) === resolved.assignment.subjectId &&
        String(assessment.class) === resolved.assignment.classId;
      if (!sameTarget || assessment.duration !== data.duration) {
        return {
          error: "Mapel, kelas, dan durasi tidak bisa diubah karena sudah ada siswa yang mengerjakan.",
          values,
        };
      }
    }

    if (data.status === "active" && assessment.status !== "active") {
      const questionCount = await Question.countDocuments({ assessment: id });
      if (questionCount === 0) {
        return { fieldErrors: { status: ["Tambahkan minimal 1 soal sebelum mengaktifkan."] }, values };
      }
    }

    assessment.title = data.title;
    assessment.description = data.description;
    assessment.subject = resolved.assignment.subjectId;
    assessment.class = resolved.assignment.classId;
    assessment.academicYear = resolved.academicYearId;
    assessment.type = data.type;
    assessment.duration = data.duration;
    assessment.startDate = dates.startDate;
    assessment.endDate = dates.endDate;
    assessment.status = data.status;
    await assessment.save();
  } catch {
    return { error: "Gagal memperbarui assessment. Coba lagi.", values };
  }

  revalidateAll(id);
  return { success: true };
}

export async function setAssessmentStatus(
  id: string,
  status: "draft" | "active" | "closed",
): Promise<AssessmentActionResult> {
  const teacher = await getTeacherFromSession();
  if (!teacher) return { error: NOT_TEACHER };
  if (!objectIdRegex.test(id) || !["draft", "active", "closed"].includes(status)) {
    return { error: "Permintaan tidak valid." };
  }

  try {
    await connectDB();
    const assessment = await Assessment.findOne({ _id: id, teacher: teacher.id });
    if (!assessment) return { error: "Assessment tidak ditemukan." };

    if (status === "active") {
      const questionCount = await Question.countDocuments({ assessment: id });
      if (questionCount === 0) return { error: "Tambahkan minimal 1 soal sebelum mengaktifkan." };
    }
    if (status === "draft" && (await AssessmentAttempt.countDocuments({ assessment: id })) > 0) {
      return { error: "Tidak bisa dikembalikan ke draft karena sudah ada siswa yang mengerjakan. Gunakan Tutup." };
    }

    assessment.status = status;
    await assessment.save();
  } catch {
    return { error: "Gagal mengubah status assessment." };
  }

  revalidateAll(id);
  return { success: true };
}

export async function deleteAssessment(id: string): Promise<AssessmentActionResult> {
  const teacher = await getTeacherFromSession();
  if (!teacher) return { error: NOT_TEACHER };
  if (!objectIdRegex.test(id)) return { error: "Assessment tidak ditemukan." };

  try {
    await connectDB();
    const deleted = await Assessment.findOneAndDelete({ _id: id, teacher: teacher.id });
    if (!deleted) return { error: "Assessment tidak ditemukan." };
    // Jangan tinggalkan soal & percobaan yatim
    await Promise.all([Question.deleteMany({ assessment: id }), AssessmentAttempt.deleteMany({ assessment: id })]);
  } catch {
    return { error: "Gagal menghapus assessment." };
  }

  revalidateAll();
  return { success: true };
}

// ── Soal ──────────────────────────────────────────────────────────────────────

export type QuestionFormValues = {
  questionType: string;
  questionText: string;
  options: string[]; // A–E
  correctAnswer: string;
  points: string;
};

export type QuestionFormState = {
  error?: string;
  values?: QuestionFormValues;
  success?: boolean;
};

const OPTION_LABELS = ["A", "B", "C", "D", "E"] as const;

function readQuestionValues(formData: FormData): QuestionFormValues {
  const str = (key: string) => {
    const v = formData.get(key);
    return typeof v === "string" ? v : "";
  };
  return {
    questionType: str("questionType"),
    questionText: str("questionText"),
    options: OPTION_LABELS.map((l) => str(`option${l}`)),
    correctAnswer: str("correctAnswer"),
    points: str("points"),
  };
}

/** Pastikan assessment milik guru ini dan belum ada yang mengerjakan. */
async function lockedForEditing(teacherId: string, assessmentId: string) {
  await connectDB();
  const assessment = await Assessment.findOne({ _id: assessmentId, teacher: teacherId }).select("_id");
  if (!assessment) return "Assessment tidak ditemukan.";
  if ((await AssessmentAttempt.countDocuments({ assessment: assessmentId })) > 0) {
    return "Soal tidak bisa diubah karena sudah ada siswa yang mengerjakan.";
  }
  return null;
}

export async function saveQuestion(
  assessmentId: string,
  questionId: string | null,
  _prev: QuestionFormState,
  formData: FormData,
): Promise<QuestionFormState> {
  const teacher = await getTeacherFromSession();
  if (!teacher) return { error: NOT_TEACHER };
  if (!objectIdRegex.test(assessmentId) || (questionId && !objectIdRegex.test(questionId))) {
    return { error: "Soal tidak ditemukan." };
  }

  const values = readQuestionValues(formData);
  const type = values.questionType;
  if (type !== "multiple-choice" && type !== "true-false" && type !== "essay") {
    return { error: "Jenis soal tidak valid.", values };
  }
  const text = values.questionText.trim();
  if (text.length < 3) return { error: "Teks soal minimal 3 karakter.", values };
  if (text.length > 5000) return { error: "Teks soal maksimal 5.000 karakter.", values };

  const points = Number(values.points);
  if (!Number.isFinite(points) || points < 0 || points > 1000) {
    return { error: "Poin harus angka 0–1000.", values };
  }

  let options: { label: string; text: string }[] = [];
  let correctAnswer = values.correctAnswer.trim();

  if (type === "multiple-choice") {
    options = values.options
      .map((t, i) => ({ label: OPTION_LABELS[i], text: t.trim() }))
      .filter((o) => o.text !== "");
    if (options.length < 2) return { error: "Pilihan ganda minimal punya 2 pilihan.", values };
    if (options.some((o) => o.text.length > 500)) return { error: "Teks pilihan maksimal 500 karakter.", values };
    if (!options.some((o) => o.label === correctAnswer)) {
      return { error: "Pilih jawaban benar yang pilihannya terisi.", values };
    }
  } else if (type === "true-false") {
    options = [
      { label: "true", text: "Benar" },
      { label: "false", text: "Salah" },
    ];
    if (correctAnswer !== "true" && correctAnswer !== "false") {
      return { error: "Pilih jawaban benar: Benar atau Salah.", values };
    }
  } else {
    // Esai: kunci/contoh jawaban opsional (model mewajibkan string tak kosong)
    if (correctAnswer.length > 5000) return { error: "Contoh jawaban maksimal 5.000 karakter.", values };
    if (correctAnswer === "") correctAnswer = "-";
  }

  try {
    const locked = await lockedForEditing(teacher.id, assessmentId);
    if (locked) return { error: locked, values };

    if (questionId) {
      const q = await Question.findOne({ _id: questionId, assessment: assessmentId });
      if (!q) return { error: "Soal tidak ditemukan.", values };
      q.questionType = type;
      q.questionText = text;
      q.options = options;
      q.correctAnswer = correctAnswer;
      q.points = points;
      await q.save();
    } else {
      const last = await Question.findOne({ assessment: assessmentId }).sort({ order: -1 }).select("order").lean<{ order: number }>();
      await Question.create({
        assessment: assessmentId,
        questionType: type,
        questionText: text,
        options,
        correctAnswer,
        points,
        order: (last?.order ?? 0) + 1,
      });
    }
  } catch {
    return { error: "Gagal menyimpan soal. Coba lagi.", values };
  }

  revalidateAll(assessmentId);
  return { success: true };
}

export async function deleteQuestion(
  assessmentId: string,
  questionId: string,
): Promise<AssessmentActionResult> {
  const teacher = await getTeacherFromSession();
  if (!teacher) return { error: NOT_TEACHER };
  if (!objectIdRegex.test(assessmentId) || !objectIdRegex.test(questionId)) {
    return { error: "Soal tidak ditemukan." };
  }

  try {
    const locked = await lockedForEditing(teacher.id, assessmentId);
    if (locked) return { error: locked };
    const deleted = await Question.findOneAndDelete({ _id: questionId, assessment: assessmentId });
    if (!deleted) return { error: "Soal tidak ditemukan." };
  } catch {
    return { error: "Gagal menghapus soal." };
  }

  revalidateAll(assessmentId);
  return { success: true };
}

// ── Koreksi esai ──────────────────────────────────────────────────────────────

export type EssayGradeState = { error?: string; success?: boolean };

/**
 * Beri poin untuk jawaban esai satu percobaan. Field form: `points_<questionId>`.
 * Kepemilikan dicek lewat assessment.teacher. Setelah semua esai terisi, skor
 * dihitung ulang dan status menjadi "graded".
 */
export async function gradeEssays(
  attemptId: string,
  _prev: EssayGradeState,
  formData: FormData,
): Promise<EssayGradeState> {
  const teacher = await getTeacherFromSession();
  if (!teacher) return { error: NOT_TEACHER };
  if (!objectIdRegex.test(attemptId)) return { error: "Percobaan tidak ditemukan." };

  try {
    await connectDB();
    const attempt = await AssessmentAttempt.findById(attemptId);
    if (!attempt) return { error: "Percobaan tidak ditemukan." };

    const assessment = await Assessment.findOne({ _id: attempt.assessment, teacher: teacher.id }).select("_id");
    if (!assessment) return { error: "Percobaan tidak ditemukan." };
    if (attempt.status === "in-progress") return { error: "Siswa belum selesai mengerjakan." };

    const questions = await Question.find({ assessment: attempt.assessment }).lean<
      Array<{ _id: unknown; questionType: string; points: number }>
    >();
    const qMap = new Map(questions.map((q) => [String(q._id), q]));

    for (const entry of attempt.answers) {
      const q = qMap.get(String(entry.question));
      if (!q || q.questionType !== "essay" || entry.answer.trim() === "") continue;

      const raw = formData.get(`points_${String(entry.question)}`);
      if (typeof raw !== "string" || raw.trim() === "") return { error: "Isi poin untuk semua jawaban esai." };
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0 || value > q.points) {
        return { error: `Poin esai harus antara 0 dan ${q.points}.` };
      }
      entry.points = value;
      entry.isCorrect = value > 0;
    }

    attempt.totalScore = attempt.answers.reduce((sum: number, e: { points: number }) => sum + e.points, 0);
    attempt.status = "graded";
    await attempt.save();

    revalidateAll(String(attempt.assessment));
  } catch {
    return { error: "Gagal menyimpan nilai esai. Coba lagi." };
  }

  return { success: true };
}
