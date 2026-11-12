"use client";

import { useState, useTransition } from "react";
import { Upload, Trash2, Search, UserX } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ImportSiswaModal } from "@/components/admin/ImportSiswaModal";
import { deleteSiswa } from "@/actions/admin/siswa";

export type SiswaRow = {
  _id: string;
  nis: string;
  nama: string;
  email: string;
  kelas: string;
  jurusan: string;
  enrollmentYear: number;
};

type Props = {
  items: SiswaRow[];
  totalCount: number;
};

export function SiswaPageClient({ items, totalCount }: Props) {
  const [importOpen, setImportOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = items.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.nama.toLowerCase().includes(q) ||
      s.nis.includes(q) ||
      s.kelas.toLowerCase().includes(q) ||
      s.jurusan.toLowerCase().includes(q)
    );
  });

  function handleDelete(id: string) {
    if (!confirm("Yakin menghapus siswa ini? Akun login juga akan dihapus.")) return;
    setDeletingId(id);
    startTransition(async () => {
      await deleteSiswa(id);
      setDeletingId(null);
    });
  }

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Data Siswa</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {totalCount} siswa terdaftar
          </p>
        </div>
        <Button onClick={() => setImportOpen(true)} className="gap-2 shrink-0">
          <Upload size={15} />
          Import Excel
        </Button>
      </div>

      {/* ── Search ──────────────────────────────────────────────────────── */}
      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, NIS, kelas, atau jurusan..."
          className="w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[#FF8833] transition"
        />
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <Card className="overflow-x-auto p-0">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-neutral-400">
            <UserX size={40} strokeWidth={1.5} />
            {search ? (
              <p className="text-sm">Tidak ada siswa yang cocok dengan pencarian.</p>
            ) : (
              <div className="text-center">
                <p className="text-sm font-medium">Belum ada data siswa.</p>
                <p className="text-xs mt-1">
                  Klik <strong>Import Excel</strong> untuk menambahkan siswa secara massal.
                </p>
              </div>
            )}
          </div>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-5 py-3 font-medium">NIS</th>
                <th className="px-5 py-3 font-medium">Nama</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Kelas</th>
                <th className="px-5 py-3 font-medium">Jurusan</th>
                <th className="px-5 py-3 font-medium">T. Masuk</th>
                <th className="px-5 py-3 font-medium w-16"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((siswa) => (
                <tr
                  key={siswa._id}
                  className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 transition-colors"
                >
                  <td className="px-5 py-3 font-mono text-neutral-500 text-xs">
                    {siswa.nis}
                  </td>
                  <td className="px-5 py-3 font-medium text-neutral-900">
                    {siswa.nama}
                  </td>
                  <td className="px-5 py-3 text-neutral-500 text-xs">
                    {siswa.email}
                  </td>
                  <td className="px-5 py-3 text-neutral-700">{siswa.kelas}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-md bg-[#FF8833]/10 px-2 py-0.5 text-xs font-semibold text-[#FF8833]">
                      {siswa.jurusan}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-neutral-500">{siswa.enrollmentYear}</td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => handleDelete(siswa._id)}
                      disabled={isPending && deletingId === siswa._id}
                      aria-label={`Hapus siswa ${siswa.nama}`}
                      className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* ── Import Modal ─────────────────────────────────────────────────── */}
      <ImportSiswaModal isOpen={importOpen} onClose={() => setImportOpen(false)} />
    </>
  );
}
