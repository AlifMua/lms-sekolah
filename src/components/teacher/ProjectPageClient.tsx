"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { FolderKanban, Lock, LockOpen, Pencil, Plus, Trash2 } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  ProjectDialog,
  DeleteProjectDialog,
  type ProjectItem,
  type ProjectAssignmentOption,
} from "@/components/teacher/ProjectDialog";
import { setProjectStatus } from "@/actions/guru/project";

type Props = {
  items: ProjectItem[];
  assignments: ProjectAssignmentOption[];
  academicYearLabel: string | null;
};

type DialogState =
  | { type: "none" }
  | { type: "create" }
  | { type: "edit"; item: ProjectItem }
  | { type: "delete"; item: ProjectItem };

const statusBadge = {
  active: "bg-emerald-50 text-emerald-700",
  closed: "bg-neutral-100 text-neutral-600",
} as const;

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ProjectPageClient({ items, assignments, academicYearLabel }: Props) {
  const [dialog, setDialog] = useState<DialogState>({ type: "none" });
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
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

  function toggleStatus(item: ProjectItem) {
    setToggleError(null);
    setTogglingId(item._id);
    startTransition(async () => {
      const res = await setProjectStatus(item._id, item.status === "active" ? "closed" : "active");
      if (res.error) setToggleError(res.error);
      setTogglingId(null);
    });
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Project</h1>
          <p className="mt-0.5 text-sm text-neutral-500">
            {items.length} project
            {academicYearLabel ? ` · Tahun ajaran ${academicYearLabel}` : ""}
          </p>
        </div>
        <Button
          id="btn-tambah-project"
          onClick={() => setDialog({ type: "create" })}
          disabled={!canCreate}
          className="shrink-0 gap-2"
        >
          <Plus size={16} />
          Tambah Project
        </Button>
      </div>

      {!canCreate && (
        <Card className="mb-4 border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
          Anda belum memiliki penugasan mengajar pada tahun ajaran aktif, sehingga belum bisa
          membuat project. Hubungi admin untuk ditugaskan ke mata pelajaran dan kelas.
        </Card>
      )}

      {toggleError && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{toggleError}</p>
      )}

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
            <option value="active">Aktif</option>
            <option value="closed">Ditutup</option>
          </select>
        </div>
      )}

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-16 text-neutral-400">
          <FolderKanban size={40} strokeWidth={1.5} />
          {items.length === 0 ? (
            <div className="text-center">
              <p className="text-sm font-medium">Belum ada project.</p>
              {canCreate && (
                <p className="mt-1 text-xs">
                  Klik <strong>Tambah Project</strong> untuk membuat project pertama.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm">Tidak ada project yang cocok dengan filter.</p>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <Card key={item._id} className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-medium text-neutral-900">{item.title}</h2>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[item.status]}`}
                >
                  {item.status === "active" ? "Aktif" : "Ditutup"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="rounded-md bg-[#FF8833]/10 px-2 py-0.5 font-semibold text-[#FF8833]">
                  {item.className}
                </span>
                <span className="text-neutral-500">{item.subjectName}</span>
                {!item.assignmentId && (
                  <span className="rounded-md bg-amber-50 px-2 py-0.5 text-amber-700">
                    Penugasan dicabut
                  </span>
                )}
              </div>

              <p className="text-xs text-neutral-500">Deadline: {formatDateTime(item.deadline)}</p>
              <p className="text-xs text-neutral-500">
                {item.submittedCount}/{item.studentCount} mengumpulkan · {item.gradedCount} dinilai
              </p>

              <div className="mt-auto flex items-center justify-between border-t border-neutral-100 pt-3">
                <div className="inline-flex items-center gap-3">
                  <Link
                    href={`/guru/project/${item._id}`}
                    className="text-xs font-medium text-[#FF8833] hover:underline"
                  >
                    Lihat pengumpulan
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggleStatus(item)}
                    disabled={isPending && togglingId === item._id}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-[#FF8833] disabled:opacity-50"
                  >
                    {item.status === "active" ? (
                      <>
                        <Lock size={14} /> Tutup
                      </>
                    ) : (
                      <>
                        <LockOpen size={14} /> Buka
                      </>
                    )}
                  </button>
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
          ))}
        </div>
      )}

      {dialog.type === "create" && (
        <ProjectDialog mode="create" onClose={close} assignments={assignments} />
      )}
      {dialog.type === "edit" && (
        <ProjectDialog mode="edit" onClose={close} assignments={assignments} item={dialog.item} />
      )}
      {dialog.type === "delete" && <DeleteProjectDialog onClose={close} item={dialog.item} />}
    </>
  );
}
