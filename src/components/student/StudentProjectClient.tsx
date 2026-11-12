"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { FolderKanban } from "lucide-react";

import { submitProject, type SubmitProjectState } from "@/actions/siswa/project";
import { Modal } from "@/components/admin/dialogs/Modal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { StudentProjectItem } from "@/lib/student";

const inputClass =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#FF8833]";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(item: StudentProjectItem): { text: string; className: string } {
  const s = item.submission;
  if (!s) {
    return item.projectStatus === "closed"
      ? { text: "Ditutup", className: "bg-neutral-100 text-neutral-600" }
      : item.isPastDeadline
        ? { text: "Lewat deadline", className: "bg-red-50 text-red-700" }
        : { text: "Belum dikumpulkan", className: "bg-amber-50 text-amber-700" };
  }
  if (s.status === "graded") return { text: "Dinilai", className: "bg-emerald-50 text-emerald-700" };
  if (s.status === "revision") return { text: "Perlu revisi", className: "bg-red-50 text-red-700" };
  return { text: "Menunggu nilai", className: "bg-sky-50 text-sky-700" };
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Mengirim..." : "Kumpulkan"}
    </Button>
  );
}

function SubmitDialog({ item, onClose }: { item: StudentProjectItem; onClose: () => void }) {
  const [state, formAction] = useActionState<SubmitProjectState, FormData>(
    submitProject.bind(null, item._id),
    {},
  );
  const [fileUrl, setFileUrl] = useState(item.submission?.fileUrl ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

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
        setFileUrl(data.url);
      }
    } catch {
      setUploadError("Terjadi kesalahan jaringan saat upload.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={item.submission ? "Perbarui Pengumpulan" : "Kumpulkan Project"} size="lg">
      <form action={formAction} className="space-y-4">
        {state.error && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{state.error}</p>
        )}
        {item.isPastDeadline && (
          <p className="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">
            Deadline sudah lewat — pengumpulan akan ditandai terlambat.
          </p>
        )}
        <div>
          <label htmlFor="pj-content" className="mb-1 block text-sm font-medium text-neutral-800">
            Deskripsi / jawaban
          </label>
          <textarea
            id="pj-content"
            name="content"
            required
            rows={6}
            defaultValue={item.submission?.content}
            placeholder="Jelaskan hasil project kamu"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="pj-file" className="mb-1 block text-sm font-medium text-neutral-800">
            Lampiran File / Link Hasil (opsional)
          </label>
          <div className="space-y-2">
            <input
              id="pj-file"
              name="fileUrl"
              type="text"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://... atau upload file di bawah"
              className={inputClass}
            />
            <div className="flex items-center gap-2">
              <input
                type="file"
                id="file-upload"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="text-xs text-neutral-500 file:mr-2 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-neutral-700 hover:file:bg-neutral-200"
              />
              {isUploading && <span className="text-xs text-neutral-500">Mengupload...</span>}
            </div>
            {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Batal
          </Button>
          <div className="flex-1">
            <SubmitButton />
          </div>
        </div>
      </form>
    </Modal>
  );
}

export function StudentProjectClient({
  items,
  className,
}: {
  items: StudentProjectItem[];
  className: string | null;
}) {
  const [selected, setSelected] = useState<StudentProjectItem | null>(null);
  // Ambil versi terbaru item dari props agar dialog tidak memegang data basi
  const current = selected ? (items.find((i) => i._id === selected._id) ?? selected) : null;

  if (!className) {
    return (
      <Card className="p-6 text-sm text-neutral-600">
        Akunmu belum terdaftar di kelas mana pun. Hubungi admin sekolah.
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 py-16 text-neutral-400">
        <FolderKanban size={40} strokeWidth={1.5} />
        <p className="text-sm">Belum ada project untuk kelas {className}.</p>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => {
          const badge = statusLabel(p);
          const s = p.submission;
          const canSubmit = p.projectStatus === "active" && s?.status !== "graded";
          return (
            <Card key={p._id} className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-semibold text-neutral-900">{p.title}</h3>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                  {badge.text}
                </span>
              </div>
              <p className="text-sm text-neutral-600 line-clamp-3 whitespace-pre-line">{p.description}</p>
              <p className="text-sm text-neutral-600"><strong>Mapel:</strong> {p.subjectName}</p>
              <p className="text-sm text-neutral-600"><strong>Guru:</strong> {p.teacherName}</p>
              <p className="text-sm text-neutral-600"><strong>Deadline:</strong> {formatDateTime(p.deadline)}</p>

              {s && (
                <div className="rounded-lg bg-neutral-50 p-3 text-sm text-neutral-600">
                  <p>
                    Dikumpulkan {formatDateTime(s.submittedAt)}
                    {s.submissionStatus === "late" && <span className="ml-1 text-red-600">(terlambat)</span>}
                  </p>
                  {s.grade !== null && (
                    <p className="mt-1 font-semibold text-neutral-900">Nilai: {s.grade}</p>
                  )}
                  {s.feedback && <p className="mt-1">Feedback: {s.feedback}</p>}
                </div>
              )}

              {canSubmit && (
                <div className="mt-auto pt-2">
                  <Button onClick={() => setSelected(p)} className="w-full">
                    {s ? (s.status === "revision" ? "Kumpulkan revisi" : "Perbarui pengumpulan") : "Kumpulkan"}
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {current && <SubmitDialog item={current} onClose={() => setSelected(null)} />}
    </>
  );
}
