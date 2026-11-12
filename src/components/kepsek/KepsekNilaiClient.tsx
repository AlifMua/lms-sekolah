"use client";

import { Card } from "@/components/ui/Card";
import type { KepsekGradebookGroup } from "@/lib/kepsek";
import { Download } from "lucide-react";

type Props = {
  groups: KepsekGradebookGroup[];
};

const KKM = 75;
const fmt = (n: number | null) => (n === null ? "—" : String(n));

export function KepsekNilaiClient({ groups }: Props) {
  async function handleExport() {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    for (const group of groups) {
      const sheetName =
        `${group.className} - ${group.subjectName}`.slice(0, 31);

      const rows: (string | number)[][] = [
        ["NIS", "Nama Siswa", "Rata-rata Assessment", "Rata-rata Project", "Nilai Akhir", "Keterangan"],
        ...group.rows.map((r) => [
          r.nis,
          r.studentName,
          r.assessmentAvg !== null ? r.assessmentAvg : "—",
          r.projectAvg !== null ? r.projectAvg : "—",
          r.finalGrade !== null ? r.finalGrade : "—",
          r.finalGrade !== null
            ? r.finalGrade >= KKM ? "Tuntas" : "Belum Tuntas"
            : "—",
        ]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"] = [
        { wch: 14 },
        { wch: 28 },
        { wch: 22 },
        { wch: 20 },
        { wch: 14 },
        { wch: 16 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    XLSX.writeFile(wb, "rekap-nilai-kepsek.xlsx");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Rekap Nilai</h1>
          <p className="mt-0.5 text-sm text-neutral-500">
            Monitoring nilai siswa seluruh kelas pada tahun ajaran aktif.
          </p>
        </div>
        {groups.length > 0 && (
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 hover:border-[#FF8833] hover:text-[#FF8833] transition-colors"
          >
            <Download size={15} />
            Export Excel
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <Card className="p-6 text-sm text-neutral-500">
          Belum ada data nilai pada tahun ajaran aktif.
        </Card>
      ) : (
        groups.map((g) => (
          <Card key={`${g.classId}-${g.subjectName}`} className="overflow-x-auto p-4">
            <div className="mb-3">
              <h2 className="font-semibold text-neutral-900">
                {g.subjectName} — {g.className}
              </h2>
              <p className="text-xs text-neutral-500">
                Jurusan: {g.majorName} · Guru: {g.teacherName}
              </p>
            </div>

            {g.rows.length === 0 ? (
              <p className="text-sm text-neutral-500">Belum ada siswa aktif di kelas ini.</p>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">NIS</th>
                    <th className="px-3 py-2 font-medium">Nama</th>
                    <th className="px-3 py-2 font-medium">Assessment</th>
                    <th className="px-3 py-2 font-medium">Project</th>
                    <th className="px-3 py-2 font-medium">Nilai Akhir</th>
                    <th className="px-3 py-2 font-medium">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((r) => (
                    <tr key={r.nis} className="border-b border-neutral-100">
                      <td className="px-3 py-2 text-neutral-600">{r.nis}</td>
                      <td className="px-3 py-2 text-neutral-800">{r.studentName}</td>
                      <td className="px-3 py-2 text-neutral-600">{fmt(r.assessmentAvg)}</td>
                      <td className="px-3 py-2 text-neutral-600">{fmt(r.projectAvg)}</td>
                      <td className="px-3 py-2 font-semibold text-neutral-900">{fmt(r.finalGrade)}</td>
                      <td className="px-3 py-2">
                        {r.finalGrade !== null ? (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              r.finalGrade >= KKM
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {r.finalGrade >= KKM ? "Tuntas" : "Belum Tuntas"}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        ))
      )}
    </div>
  );
}

