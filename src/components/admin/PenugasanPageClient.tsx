'use client';

import { useState } from 'react';
import { Plus, Trash2, UserCog } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  PenugasanDialog,
  WaliKelasDialog,
  DeletePenugasanDialog,
  type GuruOption,
  type MapelOption,
  type KelasOption,
  type TahunAjaranOption,
} from '@/components/admin/dialogs/PenugasanDialog';

// ── Types ─────────────────────────────────────────────────────────────────────

export type PenugasanRow = {
  _id: string;
  teacherName: string;
  teacherNip: string;
  subjectName: string;
  subjectCode: string;
  className: string;
  academicYearLabel: string;
};

export type KelasWaliRow = KelasOption & {
  homeroomTeacherId?: string;
  homeroomTeacherName?: string;
  homeroomTeacherNip?: string;
};

type Props = {
  penugasanList: PenugasanRow[];
  kelasWaliList: KelasWaliRow[];
  guruList: GuruOption[];
  mapelList: MapelOption[];
  kelasList: KelasOption[];
  tahunAjaranList: TahunAjaranOption[];
};

type TabKey = 'penugasan' | 'wali';

type PenugasanDialogState = 'none' | 'create';
type WaliDialog =
  | { type: 'none' }
  | { type: 'edit'; kelas: KelasWaliRow };
type DeleteDialog =
  | { type: 'none' }
  | { type: 'confirm'; item: PenugasanRow };

// ── Component ─────────────────────────────────────────────────────────────────

export function PenugasanPageClient({
  penugasanList,
  kelasWaliList,
  guruList,
  mapelList,
  kelasList,
  tahunAjaranList,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('penugasan');
  const [penugasanDialog, setPenugasanDialog] = useState<PenugasanDialogState>('none');
  const [waliDialog, setWaliDialog] = useState<WaliDialog>({ type: 'none' });
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialog>({ type: 'none' });

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Penugasan Guru</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Assign guru ke mata pelajaran & kelola wali kelas
          </p>
        </div>
        {activeTab === 'penugasan' && (
          <Button onClick={() => setPenugasanDialog('create')} className="gap-2">
            <Plus size={16} />
            Tambah Penugasan
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-neutral-200">
        {(
          [
            { key: 'penugasan', label: 'Guru & Mata Pelajaran' },
            { key: 'wali', label: 'Wali Kelas' },
          ] as { key: TabKey; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === key
                ? 'border-[#FF8833] text-[#FF8833]'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Penugasan */}
      {activeTab === 'penugasan' && (
        <>
          {penugasanList.length === 0 ? (
            <Card className="py-16 text-center text-neutral-500">
              Belum ada penugasan. Klik &quot;Tambah Penugasan&quot; untuk mulai.
            </Card>
          ) : (
            <Card className="overflow-x-auto p-0">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Guru</th>
                    <th className="px-5 py-3 font-medium">Mata Pelajaran</th>
                    <th className="px-5 py-3 font-medium">Kelas</th>
                    <th className="px-5 py-3 font-medium">Tahun Ajaran</th>
                    <th className="px-5 py-3 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {penugasanList.map((row) => (
                    <tr key={row._id} className="border-b border-neutral-100 last:border-0">
                      <td className="px-5 py-3">
                        <p className="font-medium text-neutral-900">{row.teacherName}</p>
                        <p className="text-xs text-neutral-400">{row.teacherNip}</p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-neutral-900">{row.subjectName}</p>
                        <p className="text-xs font-mono text-neutral-400">{row.subjectCode}</p>
                      </td>
                      <td className="px-5 py-3 text-neutral-700">{row.className}</td>
                      <td className="px-5 py-3 text-neutral-600">{row.academicYearLabel}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setDeleteDialog({ type: 'confirm', item: row })}
                          aria-label={`Hapus penugasan ${row.teacherName}`}
                          className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}

      {/* Tab: Wali Kelas */}
      {activeTab === 'wali' && (
        <>
          {kelasWaliList.length === 0 ? (
            <Card className="py-16 text-center text-neutral-500">
              Belum ada kelas. Tambahkan kelas terlebih dahulu di menu Kelas.
            </Card>
          ) : (
            <Card className="overflow-x-auto p-0">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Kelas</th>
                    <th className="px-5 py-3 font-medium">Wali Kelas</th>
                    <th className="px-5 py-3 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {kelasWaliList.map((row) => (
                    <tr key={row._id} className="border-b border-neutral-100 last:border-0">
                      <td className="px-5 py-3 font-medium text-neutral-900">{row.name}</td>
                      <td className="px-5 py-3">
                        {row.homeroomTeacherName ? (
                          <div>
                            <p className="text-neutral-900">{row.homeroomTeacherName}</p>
                            <p className="text-xs text-neutral-400">{row.homeroomTeacherNip}</p>
                          </div>
                        ) : (
                          <span className="text-sm italic text-neutral-400">Belum ditentukan</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setWaliDialog({ type: 'edit', kelas: row })}
                          aria-label={`Set wali kelas ${row.name}`}
                          className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                        >
                          <UserCog size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}

      {/* Dialogs — dirender hanya saat dibuka agar state form (useActionState) selalu segar.
          Jika selalu ter-mount, `state.success` dari penyimpanan sebelumnya tetap true dan
          useEffect di dialog langsung menutupnya lagi saat dibuka kedua kali. */}
      {penugasanDialog === 'create' && (
        <PenugasanDialog
          isOpen
          onClose={() => setPenugasanDialog('none')}
          guruList={guruList}
          mapelList={mapelList}
          kelasList={kelasList}
          tahunAjaranList={tahunAjaranList}
        />
      )}
      {waliDialog.type === 'edit' && (
        <WaliKelasDialog
          isOpen
          onClose={() => setWaliDialog({ type: 'none' })}
          kelas={waliDialog.kelas}
          guruList={guruList}
        />
      )}
      {deleteDialog.type === 'confirm' && (
        <DeletePenugasanDialog
          isOpen
          onClose={() => setDeleteDialog({ type: 'none' })}
          item={deleteDialog.item}
        />
      )}
    </>
  );
}
