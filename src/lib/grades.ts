/**
 * Logika murni perhitungan nilai (tanpa dependensi Next.js/DB) supaya mudah dites.
 * Hanya pekerjaan yang SUDAH DINILAI yang dihitung; yang belum dinilai diabaikan.
 */

export type ScoreItem = {
  subject: string;
  kind: "assessment" | "project";
  /** Skala 0–100; null = belum dinilai. */
  score: number | null;
};

export type SubjectGrade = {
  subject: string;
  assessmentAvg: number | null;
  projectAvg: number | null;
  finalGrade: number | null;
  assessmentCount: number;
  projectCount: number;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Rata-rata 1 desimal; null jika tidak ada data. */
export function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return round1(nums.reduce((s, n) => s + n, 0) / nums.length);
}

/** Nilai akhir = rata-rata dari kategori yang sudah punya nilai (bobot sama). */
export function finalGrade(assessmentAvg: number | null, projectAvg: number | null): number | null {
  const parts = [assessmentAvg, projectAvg].filter((n): n is number => n !== null);
  return average(parts);
}

/** Rekap per mata pelajaran, diurutkan nama mapel. */
export function summarizeBySubject(items: ScoreItem[]): SubjectGrade[] {
  const subjects = [...new Set(items.map((i) => i.subject))].sort((a, b) => a.localeCompare(b));
  return subjects.map((subject) => {
    const mine = items.filter((i) => i.subject === subject && i.score !== null);
    const a = mine.filter((i) => i.kind === "assessment").map((i) => i.score as number);
    const p = mine.filter((i) => i.kind === "project").map((i) => i.score as number);
    const assessmentAvg = average(a);
    const projectAvg = average(p);
    return {
      subject,
      assessmentAvg,
      projectAvg,
      finalGrade: finalGrade(assessmentAvg, projectAvg),
      assessmentCount: a.length,
      projectCount: p.length,
    };
  });
}
