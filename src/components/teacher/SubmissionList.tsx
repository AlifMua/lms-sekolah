"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { gradeSubmission, type GradeFormState } from "@/actions/guru/project";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export type SubmissionRow = {
  studentName: string;
  nis: string;
  submission: {
    _id: string;
    content: string;
    fileUrl: string | null;
    submittedAt: string;
    submissionStatus: "ontime" | "late";
    status: "submitted" | "graded" | "revision";
    grade: number | null;
    feedback: string | null;
  } | null;
};

const inputClass =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#FF8833]";

const statusBadge = {
  submitted: { text: "Menunggu nilai", cls: "bg-sky-50 text-sky-700" },
  graded: { text: "Dinilai", cls: "bg-emerald-50 text-emerald-700" },
  revision: { text: "Revisi diminta", cls: "bg-red-50 text-red-700" },
} as const;

function SaveButton({ label, decision }: { label: string; decision: "graded" | "revision" }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      name="decision"
      value={decision}
      variant={decision === "graded" ? "primary" : "secondary"}
      disabled={pending}
    >
      {pending ? "Menyimpan..." : label}
    </Button>
  );
}

function GradeForm({ id, grade, feedback }: { id: string; grade: number | null; feedback: string | null }) {
  const [state, formAction] = useActionState<GradeFormState, FormData>(
    gradeSubmission.bind(null, id),
    {},
  );

  return (
    <form action={formAction} className="mt-3 space-y-2 border-t border-neutral-100 pt-3">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-700">{state.error}</p>
      )}
      {state.success && (
        <p className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700">Tersimpan.</p>
      )}
      <div className="grid gap-2 sm:grid-cols-[120px_1fr]">
        <input
          name="grade"
          type="number"
          min={0}
          max={100}
          step="any"
          defaultValue={grade ?? undefined}
          placeholder="Nilai 0–100"
          aria-label="Nilai"
          className={inputClass}
        />
        <input
          name="feedback"
          type="text"
          maxLength={2000}
          defaultValue={feedback ?? ""}
          placeholder="Feedback untuk siswa (opsional)"
          aria-label="Feedback"
          className={inputClass}
        />
      </div>
      <div className="flex gap-2">
        <SaveButton label="Simpan nilai" decision="graded" />
        <SaveButton label="Minta revisi" decision="revision" />
      </div>
    </form>
  );
}

export function SubmissionList({ rows }: { rows: SubmissionRow[] }) {
  const submitted = rows.filter((r) => r.submission).length;

  if (rows.length === 0) {
    return (
      <Card className="p-6 text-sm text-neutral-500">Belum ada siswa aktif di kelas ini.</Card>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-neutral-900">
        Pengumpulan ({submitted}/{rows.length})
      </h2>
      {rows.map((r) => {
        const s = r.submission;
        return (
          <Card key={r.nis} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-neutral-900">{r.studentName}</p>
                <p className="text-xs text-neutral-500">NIS {r.nis}</p>
              </div>
              {s ? (
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[s.status].cls}`}>
                  {statusBadge[s.status].text}
                </span>
              ) : (
                <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600">
                  Belum mengumpulkan
                </span>
              )}
            </div>

            {s && (
              <>
                <p className="mt-2 text-xs text-neutral-500">
                  Dikumpulkan{" "}
                  {new Date(s.submittedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                  {s.submissionStatus === "late" && <span className="ml-1 text-red-600">(terlambat)</span>}
                </p>
                <p className="mt-2 whitespace-pre-line rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700">
                  {s.content}
                </p>
                {s.fileUrl && (
                  <a
                    href={s.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block break-all text-sm text-[#FF8833] hover:underline"
                  >
                    {s.fileUrl}
                  </a>
                )}
                <GradeForm key={`${s._id}-${s.status}-${s.grade}`} id={s._id} grade={s.grade} feedback={s.feedback} />
              </>
            )}
          </Card>
        );
      })}
    </div>
  );
}
