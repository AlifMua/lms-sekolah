'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  MapelDialog,
  DeleteMapelDialog,
  type MapelItem,
} from '@/components/admin/dialogs/MapelDialog';

type Props = { items: MapelItem[] };

type DialogState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; item: MapelItem }
  | { type: 'delete'; item: MapelItem };

const categoryLabel: Record<string, string> = {
  umum: 'Umum',
  kejuruan: 'Kejuruan',
  'muatan-lokal': 'Muatan Lokal',
};

const categoryBadge: Record<string, string> = {
  umum: 'bg-blue-50 text-blue-700',
  kejuruan: 'bg-[#FF8833]/10 text-[#FF8833]',
  'muatan-lokal': 'bg-emerald-50 text-emerald-700',
};

export function MapelPageClient({ items }: Props) {
  const [dialog, setDialog] = useState<DialogState>({ type: 'none' });

  function close() {
    setDialog({ type: 'none' });
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Mata Pelajaran</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{items.length} mata pelajaran terdaftar</p>
        </div>
        <Button onClick={() => setDialog({ type: 'create' })} className="gap-2">
          <Plus size={16} />
          Tambah Mapel
        </Button>
      </div>

      {/* Table */}
      {items.length === 0 ? (
        <Card className="py-16 text-center text-neutral-500">
          Belum ada mata pelajaran. Klik &quot;Tambah Mapel&quot; untuk mulai.
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-5 py-3 font-medium">Kode</th>
                <th className="px-5 py-3 font-medium">Nama</th>
                <th className="px-5 py-3 font-medium">Kategori</th>
                <th className="px-5 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-5 py-3 font-mono text-xs text-neutral-600">{item.code}</td>
                  <td className="px-5 py-3 font-medium text-neutral-900">{item.name}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        categoryBadge[item.category] ?? ''
                      }`}
                    >
                      {categoryLabel[item.category] ?? item.category}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setDialog({ type: 'edit', item })}
                        aria-label={`Edit ${item.name}`}
                        className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDialog({ type: 'delete', item })}
                        aria-label={`Hapus ${item.name}`}
                        className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Dialogs */}
      <MapelDialog mode="create" isOpen={dialog.type === 'create'} onClose={close} />
      {dialog.type === 'edit' && (
        <MapelDialog mode="edit" isOpen onClose={close} item={dialog.item} />
      )}
      {dialog.type === 'delete' && (
        <DeleteMapelDialog isOpen onClose={close} item={dialog.item} />
      )}
    </>
  );
}
