'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { Modal } from './Modal';
import {
  createTahunAjaran,
  updateTahunAjaran,
  activateTahunAjaran,
  deleteTahunAjaran,
  type TahunAjaranFormState,
} from '@/actions/admin/tahun-ajaran';
import { Button } from '@/components/ui/Button';

// ── Types ─────────────────────────────────────────────────────────────────────

export type TahunAjaranItem = {
  _id: string;
  year: string;
  semester: 'ganjil' | 'genap';
  isActive: boolean;
  startDate: string; // ISO string (serialized from Date)
  endDate: string;
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

function toDateInput(iso: string) {
  return iso ? iso.split('T')[0] : '';
}

// ── Form Dialog ───────────────────────────────────────────────────────────────

type TahunAjaranDialogProps = {
  mode: 'create' | 'edit';
  isOpen: boolean;
  onClose: () => void;
  item?: TahunAjaranItem;
};

const initialState: TahunAjaranFormState = {};

export function TahunAjaranDialog({ mode, isOpen, onClose, item }: TahunAjaranDialogProps) {
  const action =
    mode === 'create'
      ? createTahunAjaran
      : updateTahunAjaran.bind(null, item!._id);

  const [state, formAction] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Tambah Tahun Ajaran' : 'Edit Tahun Ajaran'}
    >
      <form action={formAction} className="space-y-4">
        {state.error && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{state.error}</p>
        )}

        <div>
          <label htmlFor="ta-year" className="mb-1 block text-sm font-medium text-neutral-800">
            Tahun <span className="text-neutral-400 font-normal">(format: 2025/2026)</span>
          </label>
          <input
            id="ta-year"
            name="year"
            type="text"
            required
            pattern="\d{4}/\d{4}"
            defaultValue={item?.year}
            placeholder="2025/2026"
            className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#FF8833]"
          />
          <FieldError msgs={state.fieldErrors?.year} />
        </div>

        <div>
          <label htmlFor="ta-semester" className="mb-1 block text-sm font-medium text-neutral-800">
            Semester
          </label>
          <select
            id="ta-semester"
            name="semester"
            required
            defaultValue={item?.semester ?? 'ganjil'}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#FF8833] bg-white"
          >
            <option value="ganjil">Ganjil</option>
            <option value="genap">Genap</option>
          </select>
          <FieldError msgs={state.fieldErrors?.semester} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="ta-start" className="mb-1 block text-sm font-medium text-neutral-800">
              Tanggal Mulai
            </label>
            <input
              id="ta-start"
              name="startDate"
              type="date"
              required
              defaultValue={item ? toDateInput(item.startDate) : ''}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#FF8833]"
            />
            <FieldError msgs={state.fieldErrors?.startDate} />
          </div>
          <div>
            <label htmlFor="ta-end" className="mb-1 block text-sm font-medium text-neutral-800">
              Tanggal Selesai
            </label>
            <input
              id="ta-end"
              name="endDate"
              type="date"
              required
              defaultValue={item ? toDateInput(item.endDate) : ''}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#FF8833]"
            />
            <FieldError msgs={state.fieldErrors?.endDate} />
          </div>
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

// ── Activate dialog ───────────────────────────────────────────────────────────

type ActivateTahunAjaranDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  item: TahunAjaranItem;
};

export function ActivateTahunAjaranDialog({ isOpen, onClose, item }: ActivateTahunAjaranDialogProps) {
  async function handleActivate() {
    await activateTahunAjaran(item._id);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Aktifkan Tahun Ajaran" size="sm">
      <p className="text-sm text-neutral-600">
        Yakin mengaktifkan{' '}
        <strong>
          {item.year} – {item.semester}
        </strong>
        ? Tahun ajaran yang sedang aktif akan dinonaktifkan secara otomatis.
      </p>
      <div className="mt-5 flex gap-2">
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
          Batal
        </Button>
        <form action={handleActivate} className="flex-1">
          <Button type="submit" className="w-full">
            Aktifkan
          </Button>
        </form>
      </div>
    </Modal>
  );
}

// ── Delete dialog ─────────────────────────────────────────────────────────────

type DeleteTahunAjaranDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  item: TahunAjaranItem;
};

export function DeleteTahunAjaranDialog({ isOpen, onClose, item }: DeleteTahunAjaranDialogProps) {
  async function handleDelete() {
    await deleteTahunAjaran(item._id);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Hapus Tahun Ajaran" size="sm">
      {item.isActive ? (
        <p className="text-sm text-red-600">
          Tahun ajaran yang sedang aktif tidak bisa dihapus. Aktifkan tahun ajaran lain terlebih dahulu.
        </p>
      ) : (
        <p className="text-sm text-neutral-600">
          Yakin menghapus tahun ajaran{' '}
          <strong>
            {item.year} – {item.semester}
          </strong>
          ? Tindakan ini tidak bisa dibatalkan.
        </p>
      )}
      <div className="mt-5 flex gap-2">
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
          {item.isActive ? 'Tutup' : 'Batal'}
        </Button>
        {!item.isActive && (
          <form action={handleDelete} className="flex-1">
            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700">
              Hapus
            </Button>
          </form>
        )}
      </div>
    </Modal>
  );
}
