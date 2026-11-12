'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { Modal } from './Modal';
import {
  createGuru,
  updateGuru,
  setGuruActive,
  type GuruFormState,
} from '@/actions/admin/guru';
import { Button } from '@/components/ui/Button';

// ── Types ─────────────────────────────────────────────────────────────────────

export type GuruItem = {
  /** _id TeacherProfile */
  _id: string;
  name: string;
  email: string;
  nip: string;
  specialization: string;
  isActive: boolean;
  activeAssignments: number;
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

function FieldError({ msgs, id }: { msgs?: string[]; id: string }) {
  if (!msgs?.length) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-xs text-red-600">
      {msgs[0]}
    </p>
  );
}

const inputClass =
  'w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#FF8833]';

// ── Form Dialog ───────────────────────────────────────────────────────────────

type GuruDialogProps = {
  mode: 'create' | 'edit';
  isOpen: boolean;
  onClose: () => void;
  item?: GuruItem;
};

const initialState: GuruFormState = {};

export function GuruDialog({ mode, isOpen, onClose, item }: GuruDialogProps) {
  const action = mode === 'create' ? createGuru : updateGuru.bind(null, item!._id);
  const [state, formAction] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  // Setelah gagal, pakai nilai yang barusan diketik admin (password tidak pernah dikembalikan)
  const v = state.values;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Tambah Guru' : 'Edit Guru'}
    >
      <form action={formAction} className="space-y-4" noValidate>
        {state.error && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <div>
          <label htmlFor="guru-name" className="mb-1 block text-sm font-medium text-neutral-800">
            Nama Lengkap
          </label>
          <input
            id="guru-name"
            name="name"
            type="text"
            required
            defaultValue={v?.name ?? item?.name}
            placeholder="Siti Rahmawati"
            className={inputClass}
          />
          <FieldError id="guru-name-error" msgs={state.fieldErrors?.name} />
        </div>

        <div>
          <label htmlFor="guru-email" className="mb-1 block text-sm font-medium text-neutral-800">
            Email (untuk login)
          </label>
          <input
            id="guru-email"
            name="email"
            type="email"
            required
            defaultValue={v?.email ?? item?.email}
            placeholder="siti@sekolah.sch.id"
            className={inputClass}
          />
          <FieldError id="guru-email-error" msgs={state.fieldErrors?.email} />
        </div>

        <div>
          <label htmlFor="guru-nip" className="mb-1 block text-sm font-medium text-neutral-800">
            NIP
          </label>
          <input
            id="guru-nip"
            name="nip"
            type="text"
            inputMode="numeric"
            required
            defaultValue={v?.nip ?? item?.nip}
            placeholder="198501012010012001"
            className={inputClass}
          />
          <FieldError id="guru-nip-error" msgs={state.fieldErrors?.nip} />
        </div>

        <div>
          <label htmlFor="guru-spec" className="mb-1 block text-sm font-medium text-neutral-800">
            Spesialisasi <span className="font-normal text-neutral-400">(opsional)</span>
          </label>
          <input
            id="guru-spec"
            name="specialization"
            type="text"
            defaultValue={v?.specialization ?? item?.specialization}
            placeholder="Bahasa Inggris"
            className={inputClass}
          />
          <FieldError id="guru-spec-error" msgs={state.fieldErrors?.specialization} />
        </div>

        <div>
          <label htmlFor="guru-password" className="mb-1 block text-sm font-medium text-neutral-800">
            {mode === 'create' ? 'Password Awal' : 'Password Baru'}
            {mode === 'edit' && (
              <span className="font-normal text-neutral-400"> (kosongkan jika tidak diubah)</span>
            )}
          </label>
          <input
            id="guru-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required={mode === 'create'}
            placeholder="Minimal 6 karakter"
            className={inputClass}
          />
          <FieldError id="guru-password-error" msgs={state.fieldErrors?.password} />
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

// ── Nonaktifkan / aktifkan dialog ─────────────────────────────────────────────

type ToggleGuruDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  item: GuruItem;
};

export function ToggleGuruDialog({ isOpen, onClose, item }: ToggleGuruDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const willDeactivate = item.isActive;

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const res = await setGuruActive(item._id, !item.isActive);
      if (res.error) setError(res.error);
      else onClose();
    });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={willDeactivate ? 'Nonaktifkan Guru' : 'Aktifkan Guru'}
      size="sm"
    >
      {error && (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <p className="text-sm text-neutral-600">
        {willDeactivate ? (
          <>
            Nonaktifkan <strong>{item.name}</strong>? Guru ini tidak akan bisa login dan akses
            gurunya langsung ditutup. Data materi dan penugasan tetap tersimpan.
          </>
        ) : (
          <>
            Aktifkan kembali <strong>{item.name}</strong>? Guru ini bisa login lagi.
          </>
        )}
      </p>
      <div className="mt-5 flex gap-2">
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
          Batal
        </Button>
        <Button
          type="button"
          id="guru-toggle-confirm"
          onClick={handleConfirm}
          disabled={isPending}
          className={`flex-1 ${willDeactivate ? 'bg-red-600 hover:bg-red-700' : ''}`}
        >
          {isPending ? 'Memproses...' : willDeactivate ? 'Nonaktifkan' : 'Aktifkan'}
        </Button>
      </div>
    </Modal>
  );
}
