'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { Modal } from './Modal';
import {
  createPenugasan,
  assignWaliKelas,
  type PenugasanFormState,
  type WaliKelasFormState,
} from '@/actions/admin/penugasan';
import { Button } from '@/components/ui/Button';

// ── Shared Types ──────────────────────────────────────────────────────────────

export type GuruOption = {
  _id: string;
  username: string;
  nip: string;
};

export type MapelOption = {
  _id: string;
  name: string;
  code: string;
};

export type KelasOption = {
  _id: string;
  name: string;
};

export type TahunAjaranOption = {
  _id: string;
  year: string;
  semester: 'ganjil' | 'genap';
  isActive: boolean;
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

// ── Penugasan Dialog (Assign Guru ke Mapel) ───────────────────────────────────

type PenugasanDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  guruList: GuruOption[];
  mapelList: MapelOption[];
  kelasList: KelasOption[];
  tahunAjaranList: TahunAjaranOption[];
};

const initialPenugasanState: PenugasanFormState = {};

export function PenugasanDialog({
  isOpen,
  onClose,
  guruList,
  mapelList,
  kelasList,
  tahunAjaranList,
}: PenugasanDialogProps) {
  const [state, formAction] = useActionState(createPenugasan, initialPenugasanState);

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tambah Penugasan Guru">
      <form action={formAction} className="space-y-4">
        {state.error && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{state.error}</p>
        )}

        {/* Guru */}
        <div>
          <label htmlFor="pngs-teacher" className="mb-1 block text-sm font-medium text-neutral-800">
            Guru
          </label>
          <select
            id="pngs-teacher"
            name="teacher"
            required
            defaultValue=""
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#FF8833]"
          >
            <option value="" disabled>-- Pilih Guru --</option>
            {guruList.map((g) => (
              <option key={g._id} value={g._id}>
                {g.username} ({g.nip})
              </option>
            ))}
          </select>
          <FieldError msgs={state.fieldErrors?.teacher} />
        </div>

        {/* Mata Pelajaran */}
        <div>
          <label htmlFor="pngs-subject" className="mb-1 block text-sm font-medium text-neutral-800">
            Mata Pelajaran
          </label>
          <select
            id="pngs-subject"
            name="subject"
            required
            defaultValue=""
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#FF8833]"
          >
            <option value="" disabled>-- Pilih Mata Pelajaran --</option>
            {mapelList.map((m) => (
              <option key={m._id} value={m._id}>
                {m.code} – {m.name}
              </option>
            ))}
          </select>
          <FieldError msgs={state.fieldErrors?.subject} />
        </div>

        {/* Kelas */}
        <div>
          <label htmlFor="pngs-class" className="mb-1 block text-sm font-medium text-neutral-800">
            Kelas
          </label>
          <select
            id="pngs-class"
            name="class"
            required
            defaultValue=""
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#FF8833]"
          >
            <option value="" disabled>-- Pilih Kelas --</option>
            {kelasList.map((k) => (
              <option key={k._id} value={k._id}>
                {k.name}
              </option>
            ))}
          </select>
          <FieldError msgs={state.fieldErrors?.class} />
        </div>

        {/* Tahun Ajaran */}
        <div>
          <label htmlFor="pngs-tahun" className="mb-1 block text-sm font-medium text-neutral-800">
            Tahun Ajaran
          </label>
          <select
            id="pngs-tahun"
            name="academicYear"
            required
            defaultValue=""
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#FF8833]"
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
            <SubmitButton label="Simpan Penugasan" />
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ── Wali Kelas Dialog ─────────────────────────────────────────────────────────

type WaliKelasDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  kelas: KelasOption & { homeroomTeacherId?: string };
  guruList: GuruOption[];
};

const initialWaliState: WaliKelasFormState = {};

export function WaliKelasDialog({ isOpen, onClose, kelas, guruList }: WaliKelasDialogProps) {
  const action = assignWaliKelas.bind(null, kelas._id);
  const [state, formAction] = useActionState(action, initialWaliState);

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Wali Kelas – ${kelas.name}`}>
      <form action={formAction} className="space-y-4">
        {state.error && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{state.error}</p>
        )}

        <div>
          <label htmlFor="wali-teacher" className="mb-1 block text-sm font-medium text-neutral-800">
            Guru (kosongkan untuk hapus wali kelas)
          </label>
          <select
            id="wali-teacher"
            name="homeroomTeacher"
            defaultValue={kelas.homeroomTeacherId ?? ''}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#FF8833]"
          >
            <option value="">-- Tanpa Wali Kelas --</option>
            {guruList.map((g) => (
              <option key={g._id} value={g._id}>
                {g.username} ({g.nip})
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Batal
          </Button>
          <div className="flex-1">
            <SubmitButton label="Simpan" />
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ── Delete Penugasan Dialog ───────────────────────────────────────────────────

type DeletePenugasanDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  item: { _id: string; teacherName: string; subjectName: string; className: string };
};

export function DeletePenugasanDialog({ isOpen, onClose, item }: DeletePenugasanDialogProps) {
  async function handleDelete() {
    const { deletePenugasan } = await import('@/actions/admin/penugasan');
    await deletePenugasan(item._id);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Hapus Penugasan" size="sm">
      <p className="text-sm text-neutral-600">
        Yakin menghapus penugasan{' '}
        <strong>{item.teacherName}</strong> mengajar{' '}
        <strong>{item.subjectName}</strong> di kelas{' '}
        <strong>{item.className}</strong>? Tindakan ini tidak bisa dibatalkan.
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
