import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { getAdminStats, listJurusan } from "@/lib/admin-data";
import { listAnnouncements } from "@/actions/admin/announcement";
import { AnnouncementAdminPanel } from "@/components/admin/AnnouncementAdminPanel";

export default async function AdminDashboardPage() {
  const [adminStats, jurusanList, announcements] = await Promise.all([
    getAdminStats(),
    listJurusan(),
    listAnnouncements("admin"),
  ]);

  const stats = [
    { label: "Total Siswa", value: adminStats.totalSiswa },
    { label: "Total Guru", value: adminStats.totalGuru },
    { label: "Total Kelas", value: adminStats.totalKelas },
    { label: "Total Jurusan", value: adminStats.totalJurusan },
  ];

  return (
    <div className="space-y-6">
      <Card className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-neutral-500">Tahun ajaran aktif</p>
          <p className="text-xl font-semibold text-neutral-900">
            {adminStats.tahunAjaranAktif}
          </p>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <Card key={item.label}>
            <p className="text-sm text-neutral-500">{item.label}</p>
            <p className="mt-2 text-3xl font-semibold text-neutral-900">
              {item.value}
            </p>
          </Card>
        ))}
      </div>

      {/* Pengumuman */}
      <AnnouncementAdminPanel items={announcements} />

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Jurusan</h2>
          <Link
            href="/admin/jurusan"
            className="text-sm font-medium text-[#FF8833] hover:underline"
          >
            Lihat semua
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {jurusanList.map((jurusan) => (
            <Link key={jurusan.id} href={`/admin/jurusan/${jurusan.slug}`}>
              <Card className="h-full hover:border-[#FF8833]/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#FF8833]">
                  {jurusan.singkatan}
                </p>
                <h3 className="mt-2 font-semibold text-neutral-900">
                  {jurusan.nama}
                </h3>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
