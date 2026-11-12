"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { Modal } from "@/components/admin/dialogs/Modal";
import { Button } from "@/components/ui/Button";
import {
  createProject,
  updateProject,
  deleteProject,
  type ProjectFormState,
} from "@/actions/guru/project";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ProjectAssignmentOption = { id: string; label: string };

export type ProjectItem = {
  _id: string;
  title: string;
  description: string;
  /** ID penugasan yang cocok. Kosong jika penugasan sudah dicabut admin. */
  assignmentId: string;
  subjectName: string;
  className: string;
  deadline: string; // ISO
  status: "active" | "closed";
  submittedCount: number;
  gradedCount: number;
  studentCount: number;
};

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

const initialState: ProjectFormState = {};

/** ISO → "YYYY-MM-DDTHH:mm" dalam zona waktu browser, untuk <input type="datetime-local">. */
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Form Dialog ───────────────────────────────────────────────────────────────

type ProjectDialogProps = {
  mode: "create" | "edit";
  onClose: () => void;
  assignments: ProjectAssignmentOption[];
  item?: ProjectItem;
};

export function ProjectDialog({ mode, onClose, assignments, item }: ProjectDialogProps) {
  const action = mode === "create" ? createProject : updateProject.bind(null, item!._id);
  const [state, formAction] = useActionState(action, initialState);
  // Dihitung sekali saat dialog dibuka (zona waktu browser, bukan server)
  const [tzOffset] = useState(() => new Date().getTimezoneOffset());
  const [defaultDeadline] = useState(() =>
    item ? toLocalInput(item.deadline) : toLocalInput(new Date(Date.now() + 7 * 86_400_000).toISOString()),
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
      title={mode === "create" ? "Tambah Project" : "Edit Project"}
      size="lg"
    >
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="tzOffset" value={tzOffset} />
        {state.error && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{state.error}</p>
        )}

        <div>
          <label htmlFor="pj-assignment" className="mb-1 block text-sm font-medium text-neutral-800">
            Mata Pelajaran &amp; Kelas
          </label>
          <select
            id="pj-assignment"
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
          <label htmlFor="pj-title" className="mb-1 block text-sm font-medium text-neutral-800">
            Judul Project
          </label>
          <input
            id="pj-title"
            name="title"
            type="text"
            required
            maxLength={150}
            defaultValue={v?.title ?? item?.title}
            placeholder="Contoh: Website Portofolio"
            className={inputClass}
          />
          <FieldError msgs={state.fieldErrors?.title} />
        </div>

        <div>
          <label htmlFor="pj-desc" className="mb-1 block text-sm font-medium text-neutral-800">
            Instruksi / Deskripsi
          </label>
          <textarea
            id="pj-desc"
            name="description"
            required
            rows={6}
            defaultValue={v?.description ?? item?.description}
            placeholder="Jelaskan tugas, kriteria penilaian, dan format pengumpulan"
            className={inputClass}
          />
          <FieldError msgs={state.fieldErrors?.description} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pj-deadline" className="mb-1 block text-sm font-medium text-neutral-800">
              Deadline
            </label>
            <input
              id="pj-deadline"
              name="deadline"
              type="datetime-local"
              required
              defaultValue={v?.deadline ?? defaultDeadline}
              className={inputClass}
            />
            <FieldError msgs={state.fieldErrors?.deadline} />
          </div>
          <div>
            <label htmlFor="pj-status" className="mb-1 block text-sm font-medium text-neutral-800">
              Status
            </label>
            <select
              id="pj-status"
              name="status"
              defaultValue={v?.status ?? item?.status ?? "active"}
              className={inputClass}
            >
              <option value="active">Aktif — siswa dapat mengumpulkan</option>
              <option value="closed">Ditutup — pengumpulan tidak diterima</option>
            </select>
            <FieldError msgs={state.fieldErrors?.status} />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Batal
          </Button>
          <div className="flex-1">
            <SubmitButton label={mode === "create" ? "Simpan Project" : "Simpan Perubahan"} />
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ── Delete dialog ─────────────────────────────────────────────────────────────

export function DeleteProjectDialog({ onClose, item }: { onClose: () => void; item: ProjectItem }) {
  const [state, formAction] = useActionState(
    async (): Promise<{ error?: string; success?: boolean }> => deleteProject(item._id),
    {},
  );

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  return (
    <Modal isOpen onClose={onClose} title="Hapus Project" size="sm">
      <p className="text-sm text-neutral-600">
        Yakin menghapus project <strong>{item.title}</strong>? Semua pengumpulan siswa
        ({item.submittedCount}) ikut terhapus dan tidak bisa dibatalkan.
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
