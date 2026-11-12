// src/app/siswa/materi/page.tsx
import { BookOpen } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { listPublishedMateri, requireStudent } from "@/lib/student";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default async function MateriPage() {
  const student = await requireStudent();
  const { className, academicYearLabel, items } = await listPublishedMateri(student.id);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Materi</h1>
        <p id="siswa-materi-summary" className="mt-0.5 text-sm text-neutral-500">
          {className ? `Kelas ${className}` : "Kelas belum ditetapkan"}
          {academicYearLabel ? ` · Tahun ajaran ${academicYearLabel}` : ""} · {items.length} materi
        </p>
      </div>

      {!className ? (
        <Card className="p-4 text-sm text-amber-800 bg-amber-50 border-amber-100">
          Akun Anda belum terhubung ke kelas mana pun. Hubungi admin.
        </Card>
      ) : items.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-16 text-neutral-400">
          <BookOpen size={40} strokeWidth={1.5} />
          <p className="text-sm">Belum ada materi yang diterbitkan untuk kelas Anda.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((m) => (
            <Card key={m._id} data-testid="materi-card" className="flex flex-col gap-3 p-4">
              <h2 className="font-semibold text-neutral-900">{m.title}</h2>
              <p className="text-sm text-neutral-600">{m.description}</p>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="rounded-md bg-[#FF8833]/10 px-2 py-0.5 font-semibold text-[#FF8833]">
                  {m.subjectName}
                </span>
                <span className="text-neutral-500">{m.teacherName}</span>
                <span className="text-neutral-400">· {formatDate(m.publishedAt)}</span>
              </div>
              {/* Isi ditampilkan sebagai teks biasa (bukan HTML) agar aman dari XSS */}
              <details className="mt-auto border-t border-neutral-100 pt-3">
                <summary className="cursor-pointer text-sm font-medium text-[#FF8833]">
                  Baca materi
                </summary>
                <div className="mt-2 whitespace-pre-wrap break-words text-sm text-neutral-700">
                  {m.content}
                </div>
              </details>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
