'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  KelasDialog,
  DeleteKelasDialog,
  type KelasItem,
} from '@/components/admin/dialogs/KelasDialog';
import type { JurusanItem } from '@/components/admin/dialogs/JurusanDialog';
import type { TahunAjaranItem } from '@/components/admin/dialogs/TahunAjaranDialog';

// Kelas dengan data jurusan & tahun ajaran sudah didenormalisasi dari DB
export type KelasRow = KelasItem & {
  majorName: string;
  majorAbbr: string;
  academicYearLabel: string;
};

type Props = {
  items: KelasRow[];
  jurusanList: JurusanItem[];
  tahunAjaranList: TahunAjaranItem[];
};

type DialogState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; item: KelasRow }
  | { type: 'delete'; item: KelasRow };

export function KelasPageClient({ items, jurusanList, tahunAjaranList }: Props) {
  const [dialog, setDialog] = useState<DialogState>({ type: 'none' });

  function close() {
    setDialog({ type: 'none' });
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Kelas</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{items.length} kelas terdaftar</p>
        </div>
        <Button onClick={() => setDialog({ type: 'create' })} className="gap-2">
          <Plus size={16} />
          Tambah Kelas
        </Button>
      </div>

      {/* Table */}
      {items.length === 0 ? (
        <Card className="py-16 text-center text-neutral-500">
          Belum ada kelas. Klik &quot;Tambah Kelas&quot; untuk mulai.
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-5 py-3 font-medium">Nama Kelas</th>
                <th className="px-5 py-3 font-medium">Tingkat</th>
                <th className="px-5 py-3 font-medium">Jurusan</th>
                <th className="px-5 py-3 font-medium">Tahun Ajaran</th>
                <th className="px-5 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-5 py-3 font-medium text-neutral-900">{item.name}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-700">
                      {item.grade}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-neutral-600">
                    <span className="text-[#FF8833] font-medium">{item.majorAbbr}</span>{' '}
                    <span className="hidden sm:inline text-neutral-500">– {item.majorName}</span>
                  </td>
                  <td className="px-5 py-3 text-neutral-600">{item.academicYearLabel}</td>
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
      <KelasDialog
        mode="create"
        isOpen={dialog.type === 'create'}
        onClose={close}
        jurusanList={jurusanList}
        tahunAjaranList={tahunAjaranList}
      />
      {dialog.type === 'edit' && (
        <KelasDialog
          mode="edit"
          isOpen
          onClose={close}
          item={dialog.item}
          jurusanList={jurusanList}
          tahunAjaranList={tahunAjaranList}
        />
      )}
      {dialog.type === 'delete' && (
        <DeleteKelasDialog isOpen onClose={close} item={dialog.item} />
      )}
    </>
  );
}
