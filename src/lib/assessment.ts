/**
 * Logika murni assessment (tanpa dependensi Next.js) supaya mudah dites.
 */

export type QuestionType = "multiple-choice" | "essay" | "true-false";

export type GradableQuestion = {
  _id: unknown;
  questionType: QuestionType;
  correctAnswer: string;
  points: number;
};

export type GradedEntry = {
  question: unknown;
  answer: string;
  isCorrect?: boolean;
  points: number;
};

export type GradeOutcome = {
  entries: GradedEntry[];
  totalScore: number;
  maxScore: number;
  /** "needs_manual_review" bila ada esai yang terisi dan belum dinilai guru. */
  status: "graded" | "needs_manual_review";
};

/** Toleransi (ms) untuk latensi jaringan saat mengumpulkan jawaban. */
export const SUBMIT_GRACE_MS = 60_000;

/**
 * Batas akhir pengumpulan sebuah attempt: yang lebih awal antara
 * (mulai + durasi) dan endDate assessment.
 */
export function attemptDeadline(startedAt: Date, durationMinutes: number, endDate: Date): Date {
  return new Date(Math.min(startedAt.getTime() + durationMinutes * 60_000, endDate.getTime()));
}

/**
 * Nilai jawaban siswa. Pilihan ganda & benar/salah dinilai otomatis; esai yang
 * terisi menunggu koreksi guru (points 0, isCorrect undefined). Esai kosong = 0.
 * `answers` dipetakan per ID soal; soal tanpa jawaban dianggap kosong.
 */
export function gradeAttempt(
  questions: GradableQuestion[],
  answers: Record<string, string>,
): GradeOutcome {
  let totalScore = 0;
  let maxScore = 0;
  let needsReview = false;

  const entries = questions.map<GradedEntry>((q) => {
    const answer = (answers[String(q._id)] ?? "").trim();
    maxScore += q.points;

    if (q.questionType === "essay") {
      if (answer === "") return { question: q._id, answer, isCorrect: false, points: 0 };
      needsReview = true;
      return { question: q._id, answer, points: 0 };
    }

    const isCorrect = answer !== "" && answer === q.correctAnswer;
    const points = isCorrect ? q.points : 0;
    totalScore += points;
    return { question: q._id, answer, isCorrect, points };
  });

  return { entries, totalScore, maxScore, status: needsReview ? "needs_manual_review" : "graded" };
}

/** Skor dalam persen 0–100 (dibulatkan 1 desimal); 0 jika maxScore 0. */
export function toPercent(totalScore: number, maxScore: number): number {
  if (maxScore <= 0) return 0;
  return Math.round((totalScore / maxScore) * 1000) / 10;
}
