'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { Modal } from './Modal';
import { createMapel, updateMapel, deleteMapel, type MapelFormState } from '@/actions/admin/mapel';
import { Button } from '@/components/ui/Button';

// ── Types ─────────────────────────────────────────────────────────────────────

export type MapelItem = {
  _id: string;
  name: string;
  code: string;
  category: 'umum' | 'kejuruan' | 'muatan-lokal';
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Menyimpan...' : label}
    </Button>
  );
}

function FieldError({ msgs }: { msgs?: string[] }) {
  if (!msgs?.length) return null;
  return <p className="mt-1 text-xs text-red-600">{msgs[0]}</p>;
}

// ── Form Dialog ───────────────────────────────────────────────────────────────

type MapelDialogProps = {
  mode: 'create' | 'edit';
  isOpen: boolean;
  onClose: () => void;
  item?: MapelItem;
};

const initialState: MapelFormState = {};

export function MapelDialog({ mode, isOpen, onClose, item }: MapelDialogProps) {
  const action = mode === 'create' ? createMapel : updateMapel.bind(null, item!._id);
  const [state, formAction] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Tambah Mata Pelajaran' : 'Edit Mata Pelajaran'}
    >
      <form action={formAction} className="space-y-4">
        {state.error && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{state.error}</p>
        )}

        <div>
          <label htmlFor="mp-name" className="mb-1 block text-sm font-medium text-neutral-800">
            Nama Mata Pelajaran
          </label>
          <input
            id="mp-name"
            name="name"
            type="text"
            required
            defaultValue={item?.name}
            placeholder="Pemrograman Web"
            className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#FF8833]"
          />
          <FieldError msgs={state.fieldErrors?.name} />
        </div>

        <div>
          <label htmlFor="mp-code" className="mb-1 block text-sm font-medium text-neutral-800">
            Kode
          </label>
          <input
            id="mp-code"
            name="code"
            type="text"
            required
            defaultValue={item?.code}
            placeholder="PWB-001"
            className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm uppercase outline-none focus:border-[#FF8833]"
          />
          <FieldError msgs={state.fieldErrors?.code} />
        </div>

        <div>
          <label htmlFor="mp-cat" className="mb-1 block text-sm font-medium text-neutral-800">
            Kategori
          </label>
          <select
            id="mp-cat"
            name="category"
            required
            defaultValue={item?.category ?? 'umum'}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#FF8833] bg-white"
          >
            <option value="umum">Umum</option>
            <option value="kejuruan">Kejuruan</option>
            <option value="muatan-lokal">Muatan Lokal</option>
          </select>
          <FieldError msgs={state.fieldErrors?.category} />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Batal
          </Button>
          <div className="flex-1">
            <SubmitButton label={mode === 'create' ? 'Tambah' : 'Simpan'} />
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ── Delete dialog ─────────────────────────────────────────────────────────────

type DeleteMapelDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  item: MapelItem;
};

export function DeleteMapelDialog({ isOpen, onClose, item }: DeleteMapelDialogProps) {
  async function handleDelete() {
    await deleteMapel(item._id);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Hapus Mata Pelajaran" size="sm">
      <p className="text-sm text-neutral-600">
        Yakin menghapus <strong>{item.name}</strong>? Tindakan ini tidak bisa dibatalkan.
      </p>
      <div className="mt-5 flex gap-2">
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
          Batal
        </Button>
        <form action={handleDelete} className="flex-1">
          <Button type="submit" className="w-full bg-red-600 hover:bg-red-700">
            Hapus
          </Button>
        </form>
      </div>
    </Modal>
  );
}
