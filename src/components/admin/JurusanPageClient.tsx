'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  JurusanDialog,
  DeleteJurusanDialog,
  type JurusanItem,
} from '@/components/admin/dialogs/JurusanDialog';

type Props = { items: JurusanItem[] };

type DialogState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; item: JurusanItem }
  | { type: 'delete'; item: JurusanItem };

export function JurusanPageClient({ items }: Props) {
  const [dialog, setDialog] = useState<DialogState>({ type: 'none' });

  function close() {
    setDialog({ type: 'none' });
  }

  return (
    <>
      {/* Header bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Jurusan</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{items.length} jurusan terdaftar</p>
        </div>
        <Button
          onClick={() => setDialog({ type: 'create' })}
          className="gap-2"
        >
          <Plus size={16} />
          Tambah Jurusan
        </Button>
      </div>

      {/* Grid */}
      {items.length === 0 ? (
        <Card className="py-16 text-center text-neutral-500">
          Belum ada jurusan. Klik &quot;Tambah Jurusan&quot; untuk mulai.
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Card key={item._id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#FF8833]">
                    {item.abbreviation}
                  </p>
                  <h2 className="mt-1 font-semibold text-neutral-900">{item.name}</h2>
                  {item.description && (
                    <p className="mt-1 text-xs text-neutral-500 line-clamp-2">{item.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => setDialog({ type: 'edit', item })}
                    aria-label={`Edit ${item.abbreviation}`}
                    className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDialog({ type: 'delete', item })}
                    aria-label={`Hapus ${item.abbreviation}`}
                    className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <JurusanDialog
        mode="create"
        isOpen={dialog.type === 'create'}
        onClose={close}
      />
      {(dialog.type === 'edit') && (
        <JurusanDialog
          mode="edit"
          isOpen
          onClose={close}
          item={dialog.item}
        />
      )}
      {(dialog.type === 'delete') && (
        <DeleteJurusanDialog
          isOpen
          onClose={close}
          item={dialog.item}
        />
      )}
    </>
  );
}
