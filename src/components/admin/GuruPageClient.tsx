'use client';

import { useState } from 'react';
import { Plus, Pencil, Power, Search, UserX } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  GuruDialog,
  ToggleGuruDialog,
  type GuruItem,
} from '@/components/admin/dialogs/GuruDialog';

type Props = { items: GuruItem[] };

type DialogState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; item: GuruItem }
  | { type: 'toggle'; item: GuruItem };

export function GuruPageClient({ items }: Props) {
  const [dialog, setDialog] = useState<DialogState>({ type: 'none' });
  const [search, setSearch] = useState('');

  function close() {
    setDialog({ type: 'none' });
  }

  const q = search.trim().toLowerCase();
  const filtered = items.filter(
    (g) =>
      !q ||
      g.name.toLowerCase().includes(q) ||
      g.email.toLowerCase().includes(q) ||
      g.nip.includes(q) ||
      g.specialization.toLowerCase().includes(q),
  );
  const activeCount = items.filter((g) => g.isActive).length;

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Data Guru</h1>
          <p className="mt-0.5 text-sm text-neutral-500">
            {items.length} guru terdaftar · {activeCount} aktif
          </p>
        </div>
        <Button
          id="guru-add-button"
          onClick={() => setDialog({ type: 'create' })}
          className="shrink-0 gap-2"
        >
          <Plus size={16} />
          Tambah Guru
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
        />
        <input
          id="guru-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, email, NIP, atau spesialisasi..."
          className="w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-[#FF8833]"
        />
      </div>

      {/* Table */}
      <Card className="overflow-x-auto p-0">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-neutral-400">
            <UserX size={40} strokeWidth={1.5} />
            <p className="text-sm">
              {search
                ? 'Tidak ada guru yang cocok dengan pencarian.'
                : 'Belum ada data guru. Klik "Tambah Guru" untuk mulai.'}
            </p>
          </div>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-5 py-3 font-medium">NIP</th>
                <th className="px-5 py-3 font-medium">Nama</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Spesialisasi</th>
                <th className="px-5 py-3 font-medium">Penugasan Aktif</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => (
                <tr
                  key={g._id}
                  data-testid={`guru-row-${g.nip}`}
                  className={`border-b border-neutral-100 transition-colors last:border-0 hover:bg-neutral-50 ${
                    g.isActive ? '' : 'bg-neutral-50/60 text-neutral-400'
                  }`}
                >
                  <td className="px-5 py-3 font-mono text-xs text-neutral-600">{g.nip}</td>
                  <td className="px-5 py-3 font-medium text-neutral-900">{g.name}</td>
                  <td className="px-5 py-3 text-xs text-neutral-600">{g.email}</td>
                  <td className="px-5 py-3 text-neutral-600">{g.specialization || '—'}</td>
                  <td className="px-5 py-3 text-neutral-600">{g.activeAssignments}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        g.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-neutral-100 text-neutral-500'
                      }`}
                    >
                      {g.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setDialog({ type: 'edit', item: g })}
                        aria-label={`Edit ${g.name}`}
                        className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDialog({ type: 'toggle', item: g })}
                        aria-label={`${g.isActive ? 'Nonaktifkan' : 'Aktifkan'} ${g.name}`}
                        className={`rounded-lg p-1.5 text-neutral-400 ${
                          g.isActive
                            ? 'hover:bg-red-50 hover:text-red-600'
                            : 'hover:bg-emerald-50 hover:text-emerald-600'
                        }`}
                      >
                        <Power size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Dialogs — dirender hanya saat dibuka agar state form selalu bersih */}
      {dialog.type === 'create' && <GuruDialog mode="create" isOpen onClose={close} />}
      {dialog.type === 'edit' && (
        <GuruDialog mode="edit" isOpen onClose={close} item={dialog.item} />
      )}
      {dialog.type === 'toggle' && <ToggleGuruDialog isOpen onClose={close} item={dialog.item} />}
    </>
  );
}
