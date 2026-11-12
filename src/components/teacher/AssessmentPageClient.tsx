"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ClipboardList, ListChecks, Lock, Pencil, Play, Plus, Trash2 } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  AssessmentDialog,
  DeleteAssessmentDialog,
  assessmentTypeLabel,
  type AssessmentItem,
  type AssessmentAssignmentOption,
} from "@/components/teacher/AssessmentDialog";
import { setAssessmentStatus } from "@/actions/guru/assessment";

type Props = {
  items: AssessmentItem[];
  assignments: AssessmentAssignmentOption[];
  academicYearLabel: string | null;
};

type DialogState =
  | { type: "none" }
  | { type: "create" }
  | { type: "edit"; item: AssessmentItem }
  | { type: "delete"; item: AssessmentItem };

const statusBadge = {
  draft: { text: "Draft", cls: "bg-neutral-100 text-neutral-600" },
  active: { text: "Aktif", cls: "bg-emerald-50 text-emerald-700" },
  closed: { text: "Ditutup", cls: "bg-red-50 text-red-700" },
} as const;

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export function AssessmentPageClient({ items, assignments, academicYearLabel }: Props) {
  const [dialog, setDialog] = useState<DialogState>({ type: "none" });
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const classNames = [...new Set(items.map((i) => i.className))].sort();
  const filtered = items.filter(
    (i) =>
      (!classFilter || i.className === classFilter) &&
      (!statusFilter || i.status === statusFilter),
  );
  const canCreate = assignments.length > 0;

  function close() {
    setDialog({ type: "none" });
  }

  function changeStatus(item: AssessmentItem, status: "active" | "closed") {
    setActionError(null);
    setBusyId(item._id);
    startTransition(async () => {
      const res = await setAssessmentStatus(item._id, status);
      if (res.error) setActionError(res.error);
      setBusyId(null);
    });
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Assessment</h1>
          <p className="mt-0.5 text-sm text-neutral-500">
            {items.length} assessment
            {academicYearLabel ? ` · Tahun ajaran ${academicYearLabel}` : ""}
          </p>
        </div>
        <Button
          id="btn-tambah-assessment"
          onClick={() => setDialog({ type: "create" })}
          disabled={!canCreate}
          className="shrink-0 gap-2"
        >
          <Plus size={16} />
          Tambah Assessment
        </Button>
      </div>

      {!canCreate && (
        <Card className="mb-4 border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
          Anda belum memiliki penugasan mengajar pada tahun ajaran aktif, sehingga belum bisa
          membuat assessment. Hubungi admin untuk ditugaskan ke mata pelajaran dan kelas.
        </Card>
      )}

      {actionError && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{actionError}</p>
      )}

      {/* Filter */}
      {items.length > 0 && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <select
            aria-label="Filter kelas"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#FF8833]"
          >
            <option value="">Semua kelas</option>
            {classNames.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#FF8833]"
          >
            <option value="">Semua status</option>
            <option value="draft">Draft</option>
            <option value="active">Aktif</option>
            <option value="closed">Ditutup</option>
          </select>
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-16 text-neutral-400">
          <ClipboardList size={40} strokeWidth={1.5} />
          {items.length === 0 ? (
            <div className="text-center">
              <p className="text-sm font-medium">Belum ada assessment.</p>
              {canCreate && (
                <p className="mt-1 text-xs">
                  Klik <strong>Tambah Assessment</strong> untuk membuat yang pertama.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm">Tidak ada assessment yang cocok dengan filter.</p>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => {
            const badge = statusBadge[item.status];
            const busy = isPending && busyId === item._id;
            return (
              <Card key={item._id} className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-medium text-neutral-900">{item.title}</h2>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}
                  >
                    {badge.text}
                  </span>
                </div>

                <p className="text-sm text-neutral-600 line-clamp-2">{item.description}</p>

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="rounded-md bg-[#FF8833]/10 px-2 py-0.5 font-semibold text-[#FF8833]">
                    {item.className}
                  </span>
                  <span className="text-neutral-500">{item.subjectName}</span>
                  <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-neutral-600">
                    {assessmentTypeLabel[item.type]}
                  </span>
                  {!item.assignmentId && (
                    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-amber-700">
                      Penugasan dicabut
                    </span>
                  )}
                </div>

                <p className="text-xs text-neutral-500">
                  {item.questionCount} soal · {item.duration} menit · {item.attemptCount} pengerjaan
                </p>
                <p className="text-xs text-neutral-400">
                  {formatDateTime(item.startDate)} → {formatDateTime(item.endDate)}
                </p>

                <div className="mt-auto flex items-center justify-between border-t border-neutral-100 pt-3">
                  <div className="inline-flex items-center gap-3">
                    <Link
                      href={`/guru/assessment/${item._id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-[#FF8833]"
                    >
                      <ListChecks size={14} /> Kelola
                    </Link>
                    {item.status !== "active" && item.status !== "closed" && (
                      <button
                        type="button"
                        onClick={() => changeStatus(item, "active")}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-[#FF8833] disabled:opacity-50"
                      >
                        <Play size={14} /> Aktifkan
                      </button>
                    )}
                    {item.status === "active" && (
                      <button
                        type="button"
                        onClick={() => changeStatus(item, "closed")}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-red-600 disabled:opacity-50"
                      >
                        <Lock size={14} /> Tutup
                      </button>
                    )}
                  </div>
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setDialog({ type: "edit", item })}
                      aria-label={`Edit ${item.title}`}
                      className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDialog({ type: "delete", item })}
                      aria-label={`Hapus ${item.title}`}
                      className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs — dirender kondisional agar state form segar tiap dibuka */}
      {dialog.type === "create" && (
        <AssessmentDialog mode="create" onClose={close} assignments={assignments} />
      )}
      {dialog.type === "edit" && (
        <AssessmentDialog mode="edit" onClose={close} assignments={assignments} item={dialog.item} />
      )}
      {dialog.type === "delete" && <DeleteAssessmentDialog onClose={close} item={dialog.item} />}
    </>
  );
}
