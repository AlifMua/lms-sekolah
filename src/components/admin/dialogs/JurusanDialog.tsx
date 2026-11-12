'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { Modal } from './Modal';
import { createJurusan, updateJurusan, deleteJurusan, type JurusanFormState } from '@/actions/admin/jurusan';
import { Button } from '@/components/ui/Button';

// ── Types ─────────────────────────────────────────────────────────────────────

export type JurusanItem = {
  _id: string;
  name: string;
  abbreviation: string;
  description?: string;
};

type JurusanDialogProps = {
  mode: 'create' | 'edit';
  isOpen: boolean;
  onClose: () => void;
  item?: JurusanItem;
};

// ── Submit button ─────────────────────────────────────────────────────────────

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Menyimpan...' : label}
    </Button>
  );
}

// ── Field error helper ────────────────────────────────────────────────────────

function FieldError({ msgs }: { msgs?: string[] }) {
  if (!msgs?.length) return null;
  return <p className="mt-1 text-xs text-red-600">{msgs[0]}</p>;
}

// ── Dialog ────────────────────────────────────────────────────────────────────

const initialState: JurusanFormState = {};

export function JurusanDialog({ mode, isOpen, onClose, item }: JurusanDialogProps) {
  const action = mode === 'create'
    ? createJurusan
    : updateJurusan.bind(null, item!._id);

  const [state, formAction] = useActionState(action, initialState);

  // Auto-close on success
  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Tambah Jurusan' : 'Edit Jurusan'}
    >
      <form action={formAction} className="space-y-4">
        {state.error && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{state.error}</p>
        )}

        <div>
          <label htmlFor="jur-name" className="mb-1 block text-sm font-medium text-neutral-800">
            Nama Jurusan
          </label>
          <input
            id="jur-name"
            name="name"
            type="text"
            required
            defaultValue={item?.name}
            placeholder="Pengembangan Perangkat Lunak dan Gim"
            className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#FF8833]"
          />
          <FieldError msgs={state.fieldErrors?.name} />
        </div>

        <div>
          <label htmlFor="jur-abbr" className="mb-1 block text-sm font-medium text-neutral-800">
            Singkatan
          </label>
          <input
            id="jur-abbr"
            name="abbreviation"
            type="text"
            required
            defaultValue={item?.abbreviation}
            placeholder="PPLG"
            className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm uppercase outline-none focus:border-[#FF8833]"
          />
          <FieldError msgs={state.fieldErrors?.abbreviation} />
        </div>

        <div>
          <label htmlFor="jur-desc" className="mb-1 block text-sm font-medium text-neutral-800">
            Deskripsi <span className="text-neutral-400">(opsional)</span>
          </label>
          <textarea
            id="jur-desc"
            name="description"
            rows={3}
            defaultValue={item?.description}
            placeholder="Deskripsi singkat jurusan..."
            className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#FF8833] resize-none"
          />
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

// ── Delete confirmation dialog ────────────────────────────────────────────────

type DeleteJurusanDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  item: JurusanItem;
};

export function DeleteJurusanDialog({ isOpen, onClose, item }: DeleteJurusanDialogProps) {
  async function handleDelete() {
    await deleteJurusan(item._id);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Hapus Jurusan" size="sm">
      <p className="text-sm text-neutral-600">
        Yakin ingin menghapus jurusan <strong>{item.name}</strong>? Tindakan ini tidak bisa dibatalkan.
      </p>
      <div className="mt-5 flex gap-2">
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
          Batal
        </Button>
        <form action={handleDelete} className="flex-1">
          <Button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700"
          >
            Hapus
          </Button>
        </form>
      </div>
    </Modal>
  );
}
