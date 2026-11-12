'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { Modal } from './Modal';
import { createKelas, updateKelas, deleteKelas, type KelasFormState } from '@/actions/admin/kelas';
import { Button } from '@/components/ui/Button';
import type { JurusanItem } from './JurusanDialog';
import type { TahunAjaranItem } from './TahunAjaranDialog';

// ── Types ─────────────────────────────────────────────────────────────────────

export type KelasItem = {
  _id: string;
  name: string;
  grade: 'X' | 'XI' | 'XII';
  major: string; // ObjectId string
  academicYear: string; // ObjectId string
  homeroomTeacher?: string;
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

type KelasDialogProps = {
  mode: 'create' | 'edit';
  isOpen: boolean;
  onClose: () => void;
  item?: KelasItem;
  /** Daftar jurusan dari DB untuk dropdown */
  jurusanList: JurusanItem[];
  /** Daftar tahun ajaran dari DB untuk dropdown */
  tahunAjaranList: TahunAjaranItem[];
};

const initialState: KelasFormState = {};

export function KelasDialog({
  mode,
  isOpen,
  onClose,
  item,
  jurusanList,
  tahunAjaranList,
}: KelasDialogProps) {
  const action = mode === 'create' ? createKelas : updateKelas.bind(null, item!._id);
  const [state, formAction] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Tambah Kelas' : 'Edit Kelas'}
    >
      <form action={formAction} className="space-y-4">
        {state.error && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{state.error}</p>
        )}

        <div>
          <label htmlFor="kls-name" className="mb-1 block text-sm font-medium text-neutral-800">
            Nama Kelas
          </label>
          <input
            id="kls-name"
            name="name"
            type="text"
            required
            defaultValue={item?.name}
            placeholder="XI PPLG 1"
            className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#FF8833]"
          />
          <FieldError msgs={state.fieldErrors?.name} />
        </div>

        <div>
          <label htmlFor="kls-grade" className="mb-1 block text-sm font-medium text-neutral-800">
            Tingkat
          </label>
          <select
            id="kls-grade"
            name="grade"
            required
            defaultValue={item?.grade ?? 'X'}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#FF8833] bg-white"
          >
            <option value="X">X</option>
            <option value="XI">XI</option>
            <option value="XII">XII</option>
          </select>
          <FieldError msgs={state.fieldErrors?.grade} />
        </div>

        <div>
          <label htmlFor="kls-major" className="mb-1 block text-sm font-medium text-neutral-800">
            Jurusan
          </label>
          <select
            id="kls-major"
            name="major"
            required
            defaultValue={item?.major ?? ''}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#FF8833] bg-white"
          >
            <option value="" disabled>-- Pilih Jurusan --</option>
            {jurusanList.map((j) => (
              <option key={j._id} value={j._id}>
                {j.abbreviation} – {j.name}
              </option>
            ))}
          </select>
          <FieldError msgs={state.fieldErrors?.major} />
        </div>

        <div>
          <label htmlFor="kls-tahun" className="mb-1 block text-sm font-medium text-neutral-800">
            Tahun Ajaran
          </label>
          <select
            id="kls-tahun"
            name="academicYear"
            required
            defaultValue={item?.academicYear ?? ''}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#FF8833] bg-white"
          >
            <option value="" disabled>-- Pilih Tahun Ajaran --</option>
            {tahunAjaranList.map((t) => (
              <option key={t._id} value={t._id}>
                {t.year} – {t.semester} {t.isActive ? '(Aktif)' : ''}
              </option>
            ))}
          </select>
          <FieldError msgs={state.fieldErrors?.academicYear} />
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

type DeleteKelasDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  item: KelasItem & { name: string };
};

export function DeleteKelasDialog({ isOpen, onClose, item }: DeleteKelasDialogProps) {
  async function handleDelete() {
    await deleteKelas(item._id);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Hapus Kelas" size="sm">
      <p className="text-sm text-neutral-600">
        Yakin menghapus kelas <strong>{item.name}</strong>? Tindakan ini tidak bisa dibatalkan.
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
