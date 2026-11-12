"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import {
  startAttempt,
  submitAttempt,
  type AssessmentActionState,
} from "@/actions/siswa/assessment";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { TakeAssessmentData } from "@/lib/student";

const inputClass =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#FF8833]";

const typeLabel = { quiz: "Kuis", uts: "UTS", uas: "UAS", tugas: "Tugas" } as const;

function fmt(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function Header({ data }: { data: TakeAssessmentData }) {
  const a = data.assessment;
  return (
    <Card className="p-4">
      <h1 className="text-xl font-semibold text-neutral-900">{a.title}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {a.subjectName} · {typeLabel[a.type]} · {a.teacherName}
      </p>
      <p className="mt-1 text-xs text-neutral-400">
        {a.questionCount} soal · {a.totalPoints} poin · {a.duration} menit · {fmt(a.startDate)} →{" "}
        {fmt(a.endDate)}
      </p>
      <p className="mt-3 whitespace-pre-line text-sm text-neutral-700">{a.description}</p>
    </Card>
  );
}

// ── Belum mulai ───────────────────────────────────────────────────────────────

function StartPanel({ data }: { data: TakeAssessmentData }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function start() {
    setError(null);
    startTransition(async () => {
      const res = await startAttempt(data.assessment._id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <Card className="space-y-3 p-4">
      {data.cannotStartReason ? (
        <p className="text-sm text-neutral-600">{data.cannotStartReason}</p>
      ) : (
        <>
          <p className="text-sm text-neutral-700">
            Setelah dimulai, waktu {data.assessment.duration} menit langsung berjalan dan assessment hanya
            bisa dikerjakan <strong>satu kali</strong>. Jika waktu habis, jawaban yang belum dikumpulkan
            tidak diterima.
          </p>
          {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
          <Button id="btn-mulai-assessment" onClick={start} disabled={pending}>
            {pending ? "Memulai..." : "Mulai mengerjakan"}
          </Button>
        </>
      )}
    </Card>
  );
}

// ── Sedang mengerjakan ────────────────────────────────────────────────────────

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? "Mengumpulkan..." : "Kumpulkan jawaban"}
    </Button>
  );
}

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function TakePanel({ data }: { data: TakeAssessmentData }) {
  const router = useRouter();
  const [state, formAction] = useActionState<AssessmentActionState, FormData>(
    submitAttempt.bind(null, data.assessment._id),
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  const deadline = new Date(data.deadline!).getTime();
  const [remaining, setRemaining] = useState(() => deadline - Date.now());
  const autoSubmitted = useRef(false);

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  useEffect(() => {
    const id = setInterval(() => setRemaining(deadline - Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  // Waktu habis → kumpulkan otomatis (server memberi toleransi singkat)
  useEffect(() => {
    if (remaining <= 0 && !autoSubmitted.current) {
      autoSubmitted.current = true;
      formRef.current?.requestSubmit();
    }
  }, [remaining]);

  // Peringatan sebelum menutup tab saat ujian berjalan
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const urgent = remaining <= 60_000;

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div
        className={`sticky top-2 z-10 flex items-center justify-between rounded-xl border px-4 py-2 shadow-sm ${
          urgent ? "border-red-200 bg-red-50 text-red-700" : "border-neutral-200 bg-white text-neutral-800"
        }`}
      >
        <span className="text-sm">Sisa waktu</span>
        <span id="assessment-timer" className="font-mono text-lg font-semibold">
          {formatRemaining(remaining)}
        </span>
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{state.error}</p>
      )}

      {data.questions.map((q, i) => (
        <Card key={q._id} className="space-y-3 p-4">
          <p className="text-xs text-neutral-500">
            Soal {i + 1} · {q.points} poin
          </p>
          <p className="whitespace-pre-line text-sm text-neutral-900">{q.questionText}</p>

          {q.questionType === "essay" ? (
            <textarea
              name={`q_${q._id}`}
              rows={5}
              maxLength={10000}
              placeholder="Tulis jawaban Anda"
              aria-label={`Jawaban soal ${i + 1}`}
              className={inputClass}
            />
          ) : (
            <div className="space-y-2">
              {q.options.map((o) => (
                <label
                  key={o.label}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:border-[#FF8833]"
                >
                  <input
                    type="radio"
                    name={`q_${q._id}`}
                    value={o.label}
                    className="mt-0.5 accent-[#FF8833]"
                  />
                  <span>
                    {q.questionType === "multiple-choice" && (
                      <strong className="mr-1">{o.label}.</strong>
                    )}
                    {o.text}
                  </span>
                </label>
              ))}
            </div>
          )}
        </Card>
      ))}

      <SubmitButton />
    </form>
  );
}

// ── Selesai ───────────────────────────────────────────────────────────────────

function ResultPanel({ data }: { data: TakeAssessmentData }) {
  const r = data.result!;
  return (
    <Card className="space-y-2 p-4">
      <h2 className="text-lg font-semibold text-neutral-900">Hasil</h2>
      {r.pendingReview ? (
        <p className="text-sm text-neutral-700">
          Jawaban Anda sudah terkumpul. Nilai akhir menunggu guru mengoreksi soal esai. Skor sementara dari
          soal otomatis: {r.totalScore}/{r.maxScore}.
        </p>
      ) : (
        <p id="assessment-result" className="text-3xl font-semibold text-neutral-900">
          {r.percent}
          <span className="ml-2 text-sm font-normal text-neutral-500">
            ({r.totalScore}/{r.maxScore} poin)
          </span>
        </p>
      )}
    </Card>
  );
}

export function TakeAssessmentClient({ data }: { data: TakeAssessmentData }) {
  return (
    <div className="space-y-4">
      <Header data={data} />
      {data.state === "not-started" && <StartPanel data={data} />}
      {data.state === "in-progress" && <TakePanel data={data} />}
      {data.state === "done" && <ResultPanel data={data} />}
    </div>
  );
}
