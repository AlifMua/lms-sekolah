"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Pin, Trash2, Bell, PlusCircle } from "lucide-react";
import {
  createAnnouncement,
  deleteAnnouncement,
  togglePinAnnouncement,
  type AnnouncementItem,
  type AnnouncementResult,
} from "@/actions/admin/announcement";

const TARGET_OPTIONS = [
  { value: "all", label: "Semua (Guru & Siswa)" },
  { value: "teacher", label: "Hanya Guru" },
  { value: "student", label: "Hanya Siswa" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const targetLabels: Record<string, string> = {
  all: "Semua",
  teacher: "Guru",
  student: "Siswa",
};

type Props = {
  items: AnnouncementItem[];
};

export function AnnouncementAdminPanel({ items }: Props) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<AnnouncementResult | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await createAnnouncement({ success: false }, formData);
      setResult(res);
      if (res.success) {
        setShowForm(false);
      }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus pengumuman ini?")) return;
    setDeleteLoading(id);
    await deleteAnnouncement(id);
    setDeleteLoading(null);
  }

  async function handlePin(id: string, pinned: boolean) {
    setPinLoading(id);
    await togglePinAnnouncement(id, !pinned);
    setPinLoading(null);
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-[#FF8833]" />
          <h2 className="text-base font-semibold text-neutral-900">Pengumuman</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            setResult(null);
            setShowForm((v) => !v);
          }}
          className="flex items-center gap-1.5 rounded-lg bg-[#FF8833] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#e67722]"
        >
          <PlusCircle size={14} />
          Buat Pengumuman
        </button>
      </div>

      {/* Form buat pengumuman */}
      {showForm && (
        <form
          action={handleSubmit}
          className="mb-4 space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4"
        >
          <h3 className="text-sm font-semibold text-neutral-800">Buat Pengumuman Baru</h3>

          {result?.error && (
            <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700">{result.error}</p>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-700">Judul</label>
            <input
              name="title"
              type="text"
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-[#FF8833] focus:outline-none"
            />
            {result?.fieldErrors?.title && (
              <p className="mt-1 text-xs text-red-600">{result.fieldErrors.title[0]}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-700">Konten</label>
            <textarea
              name="content"
              rows={3}
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-[#FF8833] focus:outline-none"
            />
            {result?.fieldErrors?.content && (
              <p className="mt-1 text-xs text-red-600">{result.fieldErrors.content[0]}</p>
            )}
          </div>

          <div className="flex gap-4 flex-wrap">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-700">
                Target Penerima
              </label>
              <select
                name="targetRole"
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-[#FF8833] focus:outline-none"
              >
                {TARGET_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
                <input type="hidden" name="pinned" value="false" />
                <input
                  type="checkbox"
                  name="pinned"
                  value="true"
                  className="rounded border-neutral-300"
                />
                Pinned (tampilkan di atas)
              </label>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-[#FF8833] px-4 py-2 text-xs font-medium text-white hover:bg-[#e67722] disabled:opacity-60"
            >
              {isPending ? "Menyimpan..." : "Buat Pengumuman"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-neutral-200 px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {/* Daftar pengumuman */}
      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Belum ada pengumuman. Buat pengumuman pertama sekarang.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item._id}
              className={`rounded-lg border p-3 ${
                item.pinned
                  ? "border-[#FF8833]/30 bg-[#FF8833]/5"
                  : "border-neutral-200 bg-neutral-50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {item.pinned && <Pin size={12} className="shrink-0 text-[#FF8833]" />}
                  <p className="text-sm font-semibold text-neutral-900">{item.title}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                    {targetLabels[item.targetRole]}
                  </span>
                  <button
                    type="button"
                    disabled={pinLoading === item._id}
                    onClick={() => handlePin(item._id, item.pinned)}
                    className={`rounded p-1 ${
                      item.pinned ? "text-[#FF8833]" : "text-neutral-400 hover:text-[#FF8833]"
                    }`}
                    title={item.pinned ? "Unpin" : "Pin"}
                  >
                    <Pin size={12} />
                  </button>
                  <button
                    type="button"
                    disabled={deleteLoading === item._id}
                    onClick={() => handleDelete(item._id)}
                    className="rounded p-1 text-neutral-400 hover:text-red-600"
                    title="Hapus"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <p className="mt-1 text-sm text-neutral-700 leading-relaxed">{item.content}</p>
              <p className="mt-2 text-xs text-neutral-400">
                {item.authorName} · {formatDate(item.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
