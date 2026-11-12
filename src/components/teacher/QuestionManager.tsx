"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Modal } from "@/components/admin/dialogs/Modal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  saveQuestion,
  deleteQuestion,
  type QuestionFormState,
} from "@/actions/guru/assessment";

export type QuestionItem = {
  _id: string;
  questionType: "multiple-choice" | "essay" | "true-false";
  questionText: string;
  options: { label: string; text: string }[];
  correctAnswer: string;
  points: number;
  order: number;
};

const typeLabel = {
  "multiple-choice": "Pilihan ganda",
  "true-false": "Benar/Salah",
  essay: "Esai",
} as const;

const OPTION_LABELS = ["A", "B", "C", "D", "E"] as const;

const inputClass =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#FF8833]";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Menyimpan..." : label}
    </Button>
  );
}

// ── Form soal ─────────────────────────────────────────────────────────────────

function QuestionDialog({
  assessmentId,
  item,
  onClose,
}: {
  assessmentId: string;
  item?: QuestionItem;
  onClose: () => void;
}) {
  const [state, formAction] = useActionState<QuestionFormState, FormData>(
    saveQuestion.bind(null, assessmentId, item?._id ?? null),
    {},
  );
  const v = state.values;
  const [type, setType] = useState<string>(v?.questionType ?? item?.questionType ?? "multiple-choice");

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  const optionText = (i: number) =>
    v?.options?.[i] ?? item?.options.find((o) => o.label === OPTION_LABELS[i])?.text ?? "";
  const correct = v?.correctAnswer ?? (item?.correctAnswer === "-" ? "" : item?.correctAnswer) ?? "";

  return (
    <Modal isOpen onClose={onClose} title={item ? "Edit Soal" : "Tambah Soal"} size="lg">
      <form action={formAction} className="space-y-4">
        {state.error && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{state.error}</p>
        )}

        <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
          <div>
            <label htmlFor="q-type" className="mb-1 block text-sm font-medium text-neutral-800">
              Jenis soal
            </label>
            <select
              id="q-type"
              name="questionType"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={inputClass}
            >
              <option value="multiple-choice">Pilihan ganda</option>
              <option value="true-false">Benar / Salah</option>
              <option value="essay">Esai</option>
            </select>
          </div>
          <div>
            <label htmlFor="q-points" className="mb-1 block text-sm font-medium text-neutral-800">
              Poin
            </label>
            <input
              id="q-points"
              name="points"
              type="number"
              min={0}
              max={1000}
              step="any"
              required
              defaultValue={v?.points ?? item?.points ?? 1}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="q-text" className="mb-1 block text-sm font-medium text-neutral-800">
            Teks soal
          </label>
          <textarea
            id="q-text"
            name="questionText"
            required
            rows={3}
            defaultValue={v?.questionText ?? item?.questionText}
            className={inputClass}
          />
        </div>

        {type === "multiple-choice" && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-neutral-800">Pilihan &amp; jawaban benar</p>
            {OPTION_LABELS.map((l, i) => (
              <div key={l} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correctAnswer"
                  value={l}
                  defaultChecked={correct === l}
                  aria-label={`Jawaban benar ${l}`}
                  className="accent-[#FF8833]"
                />
                <span className="w-5 text-sm font-semibold text-neutral-600">{l}</span>
                <input
                  name={`option${l}`}
                  type="text"
                  maxLength={500}
                  defaultValue={optionText(i)}
                  placeholder={i < 2 ? `Pilihan ${l} (wajib)` : `Pilihan ${l} (opsional)`}
                  className={inputClass}
                />
              </div>
            ))}
          </div>
        )}

        {type === "true-false" && (
          <div>
            <p className="mb-1 text-sm font-medium text-neutral-800">Jawaban benar</p>
            <div className="flex gap-4 text-sm">
              {[
                { value: "true", label: "Benar" },
                { value: "false", label: "Salah" },
              ].map((o) => (
                <label key={o.value} className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="correctAnswer"
                    value={o.value}
                    defaultChecked={correct === o.value}
                    className="accent-[#FF8833]"
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </div>
        )}

        {type === "essay" && (
          <div>
            <label htmlFor="q-key" className="mb-1 block text-sm font-medium text-neutral-800">
              Contoh jawaban / kunci (opsional, hanya terlihat guru)
            </label>
            <textarea
              id="q-key"
              name="correctAnswer"
              rows={3}
              defaultValue={correct}
              className={inputClass}
            />
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Batal
          </Button>
          <div className="flex-1">
            <SubmitButton label="Simpan Soal" />
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ── Hapus soal ────────────────────────────────────────────────────────────────

function DeleteQuestionDialog({
  assessmentId,
  item,
  onClose,
}: {
  assessmentId: string;
  item: QuestionItem;
  onClose: () => void;
}) {
  const [state, formAction] = useActionState(
    async (): Promise<{ error?: string; success?: boolean }> =>
      deleteQuestion(assessmentId, item._id),
    {},
  );

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  return (
    <Modal isOpen onClose={onClose} title="Hapus Soal" size="sm">
      <p className="text-sm text-neutral-600">Yakin menghapus soal nomor {item.order}?</p>
      {state.error && (
        <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <div className="mt-5 flex gap-2">
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
          Batal
        </Button>
        <form action={formAction} className="flex-1">
          <DeleteSubmit />
        </form>
      </div>
    </Modal>
  );
}

function DeleteSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full bg-red-600 hover:bg-red-700">
      {pending ? "Menghapus..." : "Hapus"}
    </Button>
  );
}

// ── Daftar soal ───────────────────────────────────────────────────────────────

type DialogState =
  | { type: "none" }
  | { type: "create" }
  | { type: "edit"; item: QuestionItem }
  | { type: "delete"; item: QuestionItem };

export function QuestionManager({
  assessmentId,
  questions,
  locked,
}: {
  assessmentId: string;
  questions: QuestionItem[];
  /** true jika sudah ada siswa yang mengerjakan (soal tidak bisa diubah). */
  locked: boolean;
}) {
  const [dialog, setDialog] = useState<DialogState>({ type: "none" });
  const close = () => setDialog({ type: "none" });
  const total = questions.reduce((s, q) => s + q.points, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-neutral-900">
          Soal ({questions.length}) · {total} poin
        </h2>
        <Button
          id="btn-tambah-soal"
          onClick={() => setDialog({ type: "create" })}
          disabled={locked}
          className="gap-2"
        >
          <Plus size={16} /> Tambah Soal
        </Button>
      </div>

      {locked && (
        <Card className="border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
          Soal dikunci karena sudah ada siswa yang mengerjakan.
        </Card>
      )}

      {questions.length === 0 ? (
        <Card className="p-6 text-sm text-neutral-500">
          Belum ada soal. Tambahkan minimal 1 soal sebelum mengaktifkan assessment.
        </Card>
      ) : (
        questions.map((q) => (
          <Card key={q._id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-neutral-500">
                  No. {q.order} · {typeLabel[q.questionType]} · {q.points} poin
                </p>
                <p className="mt-1 whitespace-pre-line text-sm text-neutral-900">{q.questionText}</p>
              </div>
              {!locked && (
                <div className="inline-flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setDialog({ type: "edit", item: q })}
                    aria-label={`Edit soal ${q.order}`}
                    className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDialog({ type: "delete", item: q })}
                    aria-label={`Hapus soal ${q.order}`}
                    className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>

            {q.questionType !== "essay" ? (
              <ul className="mt-2 space-y-1 text-sm">
                {q.options.map((o) => {
                  const isCorrect = o.label === q.correctAnswer;
                  return (
                    <li
                      key={o.label}
                      className={isCorrect ? "font-medium text-emerald-700" : "text-neutral-600"}
                    >
                      {q.questionType === "multiple-choice" ? `${o.label}. ` : ""}
                      {o.text}
                      {isCorrect && " ✓"}
                    </li>
                  );
                })}
              </ul>
            ) : (
              q.correctAnswer !== "-" && (
                <p className="mt-2 rounded-lg bg-neutral-50 p-2 text-xs text-neutral-600">
                  Contoh jawaban: {q.correctAnswer}
                </p>
              )
            )}
          </Card>
        ))
      )}

      {dialog.type === "create" && <QuestionDialog assessmentId={assessmentId} onClose={close} />}
      {dialog.type === "edit" && (
        <QuestionDialog assessmentId={assessmentId} item={dialog.item} onClose={close} />
      )}
      {dialog.type === "delete" && (
        <DeleteQuestionDialog assessmentId={assessmentId} item={dialog.item} onClose={close} />
      )}
    </div>
  );
}
