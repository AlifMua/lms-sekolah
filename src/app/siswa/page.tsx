// src/app/siswa/page.tsx
import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { getStudentDashboard, requireStudent } from "@/lib/student";
import { listAnnouncements } from "@/actions/admin/announcement";
import { AnnouncementWidget } from "@/components/shared/AnnouncementWidget";

export default async function SiswaDashboard() {
  const student = await requireStudent();
  const [info, announcements] = await Promise.all([
    getStudentDashboard(student.id),
    listAnnouncements("student"),
  ]);

  const quickLinks = [
    {
      href: "/siswa/materi",
      label: "Materi tersedia",
      hint: `${info.materiCount} materi dipublikasikan`,
    },
    { href: "/siswa/assessment", label: "Assessment tersedia" },
    { href: "/siswa/project", label: "Project aktif" },
    { href: "/siswa/nilai", label: "Nilai terbaru" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Info Card */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold text-neutral-900 mb-2">Selamat datang, {student.name}</h2>
          {info.className ? (
            <>
              <p className="text-sm text-neutral-600"><strong>Kelas:</strong> {info.className}</p>
              <p className="text-sm text-neutral-600">
                <strong>Jurusan:</strong> {info.majorAbbreviation ?? "—"}
                {info.majorName ? ` (${info.majorName})` : ""}
              </p>
              <p className="text-sm text-neutral-600">
                <strong>Wali Kelas:</strong> {info.homeroomTeacher ?? "Belum ditentukan"}
              </p>
              <p className="text-sm text-neutral-600">
                <strong>Tahun Ajaran:</strong> {info.academicYearLabel ?? "Belum ada yang aktif"}
              </p>
            </>
          ) : (
            <p className="text-sm text-neutral-600">
              Akunmu belum terdaftar di kelas mana pun. Hubungi admin sekolah.
            </p>
          )}
        </Card>

        {/* Quick Access Cards */}
        {quickLinks.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="flex h-full flex-col items-center justify-center p-6 text-center bg-[#FF8833]/10 text-[#FF8833]">
              <span className="text-lg font-medium">{item.label}</span>
              {item.hint && <span className="mt-1 text-sm">{item.hint}</span>}
            </Card>
          </Link>
        ))}
      </div>

      {/* Pengumuman */}
      <AnnouncementWidget items={announcements} />
    </div>
  );
}
