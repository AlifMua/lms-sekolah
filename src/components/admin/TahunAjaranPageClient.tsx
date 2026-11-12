'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  TahunAjaranDialog,
  ActivateTahunAjaranDialog,
  DeleteTahunAjaranDialog,
  type TahunAjaranItem,
} from '@/components/admin/dialogs/TahunAjaranDialog';

type Props = { items: TahunAjaranItem[] };

type DialogState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; item: TahunAjaranItem }
  | { type: 'activate'; item: TahunAjaranItem }
  | { type: 'delete'; item: TahunAjaranItem };

export function TahunAjaranPageClient({ items }: Props) {
  const [dialog, setDialog] = useState<DialogState>({ type: 'none' });

  function close() {
    setDialog({ type: 'none' });
  }

  const semesterLabel = (s: string) => (s === 'ganjil' ? 'Ganjil' : 'Genap');

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Tahun Ajaran</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{items.length} tahun ajaran terdaftar</p>
        </div>
        <Button onClick={() => setDialog({ type: 'create' })} className="gap-2">
          <Plus size={16} />
          Tambah
        </Button>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <Card className="py-16 text-center text-neutral-500">
          Belum ada tahun ajaran. Klik &quot;Tambah&quot; untuk mulai.
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item._id} className="flex items-center gap-4">
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-neutral-900">
                    {item.year} – Semester {semesterLabel(item.semester)}
                  </p>
                  {item.isActive && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FF8833]/10 px-2.5 py-0.5 text-xs font-semibold text-[#FF8833]">
                      <CheckCircle size={11} />
                      Aktif
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {new Date(item.startDate).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}{' '}
                  –{' '}
                  {new Date(item.endDate).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-1">
                {!item.isActive && (
                  <button
                    type="button"
                    onClick={() => setDialog({ type: 'activate', item })}
                    aria-label="Aktifkan"
                    className="rounded-lg px-2.5 py-1 text-xs font-medium text-[#FF8833] hover:bg-[#FF8833]/10"
                  >
                    Aktifkan
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDialog({ type: 'edit', item })}
                  aria-label="Edit"
                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setDialog({ type: 'delete', item })}
                  aria-label="Hapus"
                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <TahunAjaranDialog mode="create" isOpen={dialog.type === 'create'} onClose={close} />
      {dialog.type === 'edit' && (
        <TahunAjaranDialog mode="edit" isOpen onClose={close} item={dialog.item} />
      )}
      {dialog.type === 'activate' && (
        <ActivateTahunAjaranDialog isOpen onClose={close} item={dialog.item} />
      )}
      {dialog.type === 'delete' && (
        <DeleteTahunAjaranDialog isOpen onClose={close} item={dialog.item} />
      )}
    </>
  );
}
