"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { Modal } from "@/components/admin/dialogs/Modal";
import { Button } from "@/components/ui/Button";
import {
  createAssessment,
  updateAssessment,
  deleteAssessment,
  type AssessmentFormState,
} from "@/actions/guru/assessment";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AssessmentAssignmentOption = { id: string; label: string };

export type AssessmentItem = {
  _id: string;
  title: string;
  description: string;
  /** ID penugasan yang cocok. Kosong jika penugasan sudah dicabut admin. */
  assignmentId: string;
  subjectName: string;
  className: string;
  type: "quiz" | "uts" | "uas" | "tugas";
  duration: number;
  startDate: string; // ISO
  endDate: string; // ISO
  status: "draft" | "active" | "closed";
  questionCount: number;
  attemptCount: number;
};

export const assessmentTypeLabel = {
  quiz: "Kuis",
  uts: "UTS",
  uas: "UAS",
  tugas: "Tugas",
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Menyimpan..." : label}
    </Button>
  );
}

function FieldError({ msgs }: { msgs?: string[] }) {
  if (!msgs?.length) return null;
  return <p className="mt-1 text-xs text-red-600">{msgs[0]}</p>;
}

const inputClass =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#FF8833]";

const initialState: AssessmentFormState = {};

/** ISO → "YYYY-MM-DDTHH:mm" dalam zona waktu browser, untuk <input type="datetime-local">. */
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Form Dialog ───────────────────────────────────────────────────────────────

type AssessmentDialogProps = {
  mode: "create" | "edit";
  onClose: () => void;
  assignments: AssessmentAssignmentOption[];
  item?: AssessmentItem;
};

export function AssessmentDialog({ mode, onClose, assignments, item }: AssessmentDialogProps) {
  const action = mode === "create" ? createAssessment : updateAssessment.bind(null, item!._id);
  const [state, formAction] = useActionState(action, initialState);
  // Dihitung sekali saat dialog dibuka (zona waktu browser, bukan server)
  const [tzOffset] = useState(() => new Date().getTimezoneOffset());
  const [defaultStart] = useState(() =>
    item ? toLocalInput(item.startDate) : toLocalInput(new Date().toISOString()),
  );
  const [defaultEnd] = useState(() =>
    item ? toLocalInput(item.endDate) : toLocalInput(new Date(Date.now() + 7 * 86_400_000).toISOString()),
  );

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  const v = state.values;
  const assignmentValue = v?.assignmentId ?? item?.assignmentId ?? assignments[0]?.id ?? "";

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={mode === "create" ? "Tambah Assessment" : "Edit Assessment"}
      size="lg"
    >
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="tzOffset" value={tzOffset} />
        {state.error && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{state.error}</p>
        )}

        <div>
          <label htmlFor="as-assignment" className="mb-1 block text-sm font-medium text-neutral-800">
            Mata Pelajaran &amp; Kelas
          </label>
          <select
            id="as-assignment"
            name="assignmentId"
            required
            defaultValue={assignmentValue}
            className={inputClass}
          >
            {mode === "edit" && !item?.assignmentId && (
              <option value="">— Pilih penugasan (penugasan lama sudah dicabut) —</option>
            )}
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
          <FieldError msgs={state.fieldErrors?.assignmentId} />
        </div>

        <div>
          <label htmlFor="as-title" className="mb-1 block text-sm font-medium text-neutral-800">
            Judul Assessment
          </label>
          <input
            id="as-title"
            name="title"
            type="text"
            required
            maxLength={150}
            defaultValue={v?.title ?? item?.title}
            placeholder="Contoh: Kuis Bab 1 — Algoritma"
            className={inputClass}
          />
          <FieldError msgs={state.fieldErrors?.title} />
        </div>

        <div>
          <label htmlFor="as-desc" className="mb-1 block text-sm font-medium text-neutral-800">
            Deskripsi / Petunjuk
          </label>
          <textarea
            id="as-desc"
            name="description"
            required
            rows={4}
            defaultValue={v?.description ?? item?.description}
            placeholder="Petunjuk pengerjaan untuk siswa"
            className={inputClass}
          />
          <FieldError msgs={state.fieldErrors?.description} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="as-type" className="mb-1 block text-sm font-medium text-neutral-800">
              Jenis
            </label>
            <select
              id="as-type"
              name="type"
              defaultValue={v?.type ?? item?.type ?? "quiz"}
              className={inputClass}
            >
              <option value="quiz">Kuis</option>
              <option value="uts">UTS</option>
              <option value="uas">UAS</option>
              <option value="tugas">Tugas</option>
            </select>
            <FieldError msgs={state.fieldErrors?.type} />
          </div>
          <div>
            <label htmlFor="as-duration" className="mb-1 block text-sm font-medium text-neutral-800">
              Durasi (menit)
            </label>
            <input
              id="as-duration"
              name="duration"
              type="number"
              required
              min={1}
              max={600}
              defaultValue={v?.duration ?? item?.duration ?? 60}
              className={inputClass}
            />
            <FieldError msgs={state.fieldErrors?.duration} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="as-start" className="mb-1 block text-sm font-medium text-neutral-800">
              Mulai
            </label>
            <input
              id="as-start"
              name="startDate"
              type="datetime-local"
              required
              defaultValue={v?.startDate ?? defaultStart}
              className={inputClass}
            />
            <FieldError msgs={state.fieldErrors?.startDate} />
          </div>
          <div>
            <label htmlFor="as-end" className="mb-1 block text-sm font-medium text-neutral-800">
              Selesai (deadline)
            </label>
            <input
              id="as-end"
              name="endDate"
              type="datetime-local"
              required
              defaultValue={v?.endDate ?? defaultEnd}
              className={inputClass}
            />
            <FieldError msgs={state.fieldErrors?.endDate} />
          </div>
        </div>

        <div>
          <label htmlFor="as-status" className="mb-1 block text-sm font-medium text-neutral-800">
            Status
          </label>
          <select
            id="as-status"
            name="status"
            defaultValue={v?.status ?? item?.status ?? "draft"}
            className={inputClass}
          >
            <option value="draft">Draft — belum terlihat siswa</option>
            {mode === "edit" && <option value="active">Aktif — siswa dapat mengerjakan</option>}
            {mode === "edit" && <option value="closed">Ditutup — pengerjaan tidak diterima</option>}
          </select>
          {mode === "create" && (
            <p className="mt-1 text-xs text-neutral-500">
              Tambahkan soal setelah disimpan, lalu aktifkan assessment.
            </p>
          )}
          <FieldError msgs={state.fieldErrors?.status} />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Batal
          </Button>
          <div className="flex-1">
            <SubmitButton label={mode === "create" ? "Simpan Assessment" : "Simpan Perubahan"} />
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ── Delete dialog ─────────────────────────────────────────────────────────────

export function DeleteAssessmentDialog({
  onClose,
  item,
}: {
  onClose: () => void;
  item: AssessmentItem;
}) {
  const [state, formAction] = useActionState(
    async (): Promise<{ error?: string; success?: boolean }> => deleteAssessment(item._id),
    {},
  );

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  return (
    <Modal isOpen onClose={onClose} title="Hapus Assessment" size="sm">
      <p className="text-sm text-neutral-600">
        Yakin menghapus assessment <strong>{item.title}</strong>? {item.questionCount} soal dan{" "}
        {item.attemptCount} hasil pengerjaan siswa ikut terhapus dan tidak bisa dibatalkan.
      </p>
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
