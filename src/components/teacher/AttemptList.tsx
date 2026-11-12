"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { gradeEssays, type EssayGradeState } from "@/actions/guru/assessment";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export type AttemptEssay = {
  questionId: string;
  order: number;
  questionText: string;
  maxPoints: number;
  answer: string;
  points: number;
  graded: boolean;
};

export type AttemptRow = {
  attemptId: string;
  studentName: string;
  nis: string;
  status: "in-progress" | "submitted" | "needs_manual_review" | "graded";
  totalScore: number;
  maxScore: number;
  percent: number;
  submittedAt: string | null;
  essays: AttemptEssay[];
};

const inputClass =
  "w-24 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#FF8833]";

const statusBadge = {
  "in-progress": { text: "Sedang mengerjakan", cls: "bg-amber-50 text-amber-700" },
  submitted: { text: "Selesai", cls: "bg-sky-50 text-sky-700" },
  needs_manual_review: { text: "Perlu koreksi esai", cls: "bg-red-50 text-red-700" },
  graded: { text: "Dinilai", cls: "bg-emerald-50 text-emerald-700" },
} as const;

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Menyimpan..." : "Simpan nilai esai"}
    </Button>
  );
}

function EssayForm({ row }: { row: AttemptRow }) {
  const [state, formAction] = useActionState<EssayGradeState, FormData>(
    gradeEssays.bind(null, row.attemptId),
    {},
  );

  return (
    <form action={formAction} className="mt-3 space-y-3 border-t border-neutral-100 pt-3">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-700">{state.error}</p>
      )}
      {state.success && (
        <p className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700">Tersimpan.</p>
      )}
      {row.essays.map((e) => (
        <div key={e.questionId} className="space-y-1.5">
          <p className="text-xs text-neutral-500">
            Soal {e.order} (maks {e.maxPoints} poin)
          </p>
          <p className="text-sm text-neutral-900">{e.questionText}</p>
          <p className="whitespace-pre-line rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700">
            {e.answer}
          </p>
          <input
            name={`points_${e.questionId}`}
            type="number"
            min={0}
            max={e.maxPoints}
            step="any"
            required
            defaultValue={e.graded ? e.points : undefined}
            placeholder="Poin"
            aria-label={`Poin soal ${e.order}`}
            className={inputClass}
          />
        </div>
      ))}
      <SaveButton />
    </form>
  );
}

export function AttemptList({ rows, studentCount }: { rows: AttemptRow[]; studentCount: number }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-neutral-900">
        Hasil Pengerjaan ({rows.length}/{studentCount})
      </h2>
      {rows.length === 0 ? (
        <Card className="p-6 text-sm text-neutral-500">Belum ada siswa yang mengerjakan.</Card>
      ) : (
        rows.map((r) => {
          const badge = statusBadge[r.status];
          const finished = r.status !== "in-progress";
          return (
            <Card key={r.attemptId} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-neutral-900">{r.studentName}</p>
                  <p className="text-xs text-neutral-500">NIS {r.nis}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}>
                  {badge.text}
                </span>
              </div>
              {finished && (
                <p className="mt-2 text-sm text-neutral-700">
                  Skor {r.totalScore}/{r.maxScore} ({r.percent}%)
                  {r.submittedAt && (
                    <span className="ml-2 text-xs text-neutral-400">
                      {new Date(r.submittedAt).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  )}
                </p>
              )}
              {finished && r.essays.length > 0 && (
                <EssayForm key={`${r.attemptId}-${r.status}-${r.totalScore}`} row={r} />
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
