"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { Modal } from "@/components/admin/dialogs/Modal";
import { Button } from "@/components/ui/Button";
import {
  createMateri,
  updateMateri,
  deleteMateri,
  type MateriFormState,
} from "@/actions/guru/materi";

// ── Types ─────────────────────────────────────────────────────────────────────

export type MateriAssignmentOption = {
  id: string;
  label: string; // mis. "Bahasa Inggris — X PPLG 1"
};

export type MateriItem = {
  _id: string;
  title: string;
  description: string;
  content: string;
  /** ID penugasan yang cocok (mapel+kelas). Kosong jika penugasan sudah dicabut admin. */
  assignmentId: string;
  subjectName: string;
  className: string;
  status: "draft" | "published";
  publishedAt: string | null;
  updatedAt: string;
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

const initialState: MateriFormState = {};

// ── Form Dialog ───────────────────────────────────────────────────────────────
// Dirender kondisional oleh parent (mount saat dibuka) supaya state form
// selalu segar setiap dialog dibuka.

type MateriDialogProps = {
  mode: "create" | "edit";
  onClose: () => void;
  assignments: MateriAssignmentOption[];
  item?: MateriItem;
};

export function MateriDialog({ mode, onClose, assignments, item }: MateriDialogProps) {
  const action = mode === "create" ? createMateri : updateMateri.bind(null, item!._id);
  const [state, formAction] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  // Setelah gagal, React 19 mengosongkan field tak-terkontrol → pakai nilai yang dikembalikan server
  const v = state.values;
  const assignmentValue = v?.assignmentId ?? item?.assignmentId ?? assignments[0]?.id ?? "";

  const [content, setContent] = useState(v?.content ?? item?.content ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setUploadError(data.error || "Gagal mengupload file.");
      } else {
        const linkMarkdown = `\n\n[📄 Lampiran: ${data.originalName}](${data.url})\n`;
        setContent((prev) => prev + linkMarkdown);
      }
    } catch {
      setUploadError("Terjadi kesalahan jaringan saat upload.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={mode === "create" ? "Tambah Materi" : "Edit Materi"}
      size="lg"
    >
      <form action={formAction} className="space-y-4">
        {state.error && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{state.error}</p>
        )}

        <div>
          <label htmlFor="mt-assignment" className="mb-1 block text-sm font-medium text-neutral-800">
            Mata Pelajaran &amp; Kelas
          </label>
          <select
            id="mt-assignment"
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
          <label htmlFor="mt-title" className="mb-1 block text-sm font-medium text-neutral-800">
            Judul Materi
          </label>
          <input
            id="mt-title"
            name="title"
            type="text"
            required
            maxLength={150}
            defaultValue={v?.title ?? item?.title}
            placeholder="Contoh: Pengenalan Present Tense"
            className={inputClass}
          />
          <FieldError msgs={state.fieldErrors?.title} />
        </div>

        <div>
          <label htmlFor="mt-desc" className="mb-1 block text-sm font-medium text-neutral-800">
            Deskripsi Singkat
          </label>
          <input
            id="mt-desc"
            name="description"
            type="text"
            required
            maxLength={500}
            defaultValue={v?.description ?? item?.description}
            placeholder="Ringkasan satu kalimat yang tampil di daftar materi"
            className={inputClass}
          />
          <FieldError msgs={state.fieldErrors?.description} />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="mt-content" className="block text-sm font-medium text-neutral-800">
              Isi Materi
            </label>
            <div className="flex items-center gap-2">
              <label
                htmlFor="mt-file-upload"
                className="cursor-pointer text-xs font-medium text-[#FF8833] hover:underline"
              >
                + Unggah Lampiran
              </label>
              <input
                id="mt-file-upload"
                type="file"
                className="hidden"
                disabled={isUploading}
                onChange={handleFileUpload}
              />
              {isUploading && <span className="text-xs text-neutral-500">Mengunggah...</span>}
            </div>
          </div>
          {uploadError && <p className="mb-1 text-xs text-red-600">{uploadError}</p>}
          <textarea
            id="mt-content"
            name="content"
            required
            rows={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={"Tulis isi materi di sini.\nGunakan format Markdown, mis. # Judul, **tebal**, - daftar."}
            className={`${inputClass} font-mono leading-relaxed`}
          />
          <FieldError msgs={state.fieldErrors?.content} />
        </div>

        <div>
          <label htmlFor="mt-status" className="mb-1 block text-sm font-medium text-neutral-800">
            Status
          </label>
          <select
            id="mt-status"
            name="status"
            defaultValue={v?.status ?? item?.status ?? "draft"}
            className={inputClass}
          >
            <option value="draft">Draft — hanya terlihat oleh Anda</option>
            <option value="published">Terbit — dapat dibaca siswa di kelas tersebut</option>
          </select>
          <FieldError msgs={state.fieldErrors?.status} />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Batal
          </Button>
          <div className="flex-1">
            <SubmitButton label={mode === "create" ? "Simpan Materi" : "Simpan Perubahan"} />
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ── Delete dialog ─────────────────────────────────────────────────────────────

type DeleteMateriDialogProps = {
  onClose: () => void;
  item: MateriItem;
};

export function DeleteMateriDialog({ onClose, item }: DeleteMateriDialogProps) {
  const [state, formAction] = useActionState(async (): Promise<{ error?: string; success?: boolean }> => {
    return deleteMateri(item._id);
  }, {});

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  return (
    <Modal isOpen onClose={onClose} title="Hapus Materi" size="sm">
      <p className="text-sm text-neutral-600">
        Yakin menghapus materi <strong>{item.title}</strong>? Tindakan ini tidak bisa dibatalkan.
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
