import { connectDB } from "@/lib/mongodb";
import { gradeAttempt, type GradableQuestion } from "@/lib/assessment";
import type { IAssessmentAttempt } from "@/models/AssessmentAttempt";
import Question from "@/models/Question";

export type LoadedQuestion = GradableQuestion & {
  questionText: string;
  options: { label: string; text: string }[];
  order: number;
};

/** Semua soal sebuah assessment (termasuk kunci jawaban — JANGAN kirim ke client siswa). */
export async function loadQuestions(assessmentId: unknown): Promise<LoadedQuestion[]> {
  await connectDB();
  return Question.find({ assessment: assessmentId })
    .sort({ order: 1 })
    .lean<LoadedQuestion[]>();
}

/**
 * Nilai & tutup sebuah percobaan yang sedang berjalan. `answers` dipetakan per ID
 * soal; kosong = tidak ada jawaban (mis. waktu habis sebelum dikumpulkan).
 */
export async function finalizeAttempt(
  attempt: IAssessmentAttempt,
  questions: LoadedQuestion[],
  answers: Record<string, string>,
) {
  const outcome = gradeAttempt(questions, answers);
  attempt.answers = outcome.entries as IAssessmentAttempt["answers"];
  attempt.totalScore = outcome.totalScore;
  attempt.maxScore = outcome.maxScore;
  attempt.submittedAt = new Date();
  attempt.status = outcome.status;
  await attempt.save();
  return outcome;
}
