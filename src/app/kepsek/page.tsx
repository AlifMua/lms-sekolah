import { Card } from "@/components/ui/Card";
import {
  requirePrincipal,
  getKepsekDashboardStats,
  getJurusanStats,
} from "@/lib/kepsek";
import { KepsekCharts } from "@/components/kepsek/KepsekCharts";

export default async function KepsekDashboard() {
  await requirePrincipal();

  const [stats, jurusanStats] = await Promise.all([
    getKepsekDashboardStats(),
    getJurusanStats(),
  ]);

  const statCards = [
    { label: "Siswa Aktif", value: stats.totalSiswaAktif },
    { label: "Guru Aktif", value: stats.totalGuruAktif },
    { label: "Total Kelas", value: stats.totalKelas },
    { label: "Total Jurusan", value: stats.totalJurusan },
    { label: "Materi Diterbitkan", value: stats.materiDiterbitkan },
    { label: "Assessment Aktif", value: stats.assessmentAktif },
    { label: "Project Aktif", value: stats.projectAktif },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral-500">Tahun Ajaran Aktif</p>
          <p className="text-xl font-semibold text-neutral-900">
            {stats.tahunAjaranAktif
              ? `${stats.tahunAjaranAktif.year} (${stats.tahunAjaranAktif.semester})`
              : "Belum ada tahun ajaran aktif"}
          </p>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <p className="text-sm text-neutral-500">{s.label}</p>
            <p className="mt-2 text-3xl font-semibold text-neutral-900">{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Grafik */}
      <KepsekCharts jurusanStats={jurusanStats} />

      {/* Tabel Jurusan */}
      <Card>
        <h2 className="mb-4 text-base font-semibold text-neutral-900">Ringkasan per Jurusan</h2>
        {jurusanStats.length === 0 ? (
          <p className="text-sm text-neutral-500">Belum ada data jurusan.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Singkatan</th>
                  <th className="px-3 py-2 font-medium">Nama Jurusan</th>
                  <th className="px-3 py-2 font-medium text-right">Total Siswa</th>
                  <th className="px-3 py-2 font-medium text-right">Rata-rata Nilai</th>
                </tr>
              </thead>
              <tbody>
                {jurusanStats.map((j) => (
                  <tr key={j.id} className="border-b border-neutral-100">
                    <td className="px-3 py-2 font-semibold text-[#FF8833]">
                      {j.abbreviation}
                    </td>
                    <td className="px-3 py-2 text-neutral-800">{j.name}</td>
                    <td className="px-3 py-2 text-right text-neutral-600">{j.totalSiswa}</td>
                    <td className="px-3 py-2 text-right font-medium text-neutral-900">
                      {j.avgFinalGrade !== null ? j.avgFinalGrade : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

