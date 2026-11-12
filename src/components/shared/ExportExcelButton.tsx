"use client";

import { Download } from "lucide-react";
import type { GradebookGroup } from "@/lib/teacher-grades";

type Props = {
  groups: GradebookGroup[];
  filename?: string;
};

const KKM = 75;

export function ExportExcelButton({ groups, filename = "rekap-nilai" }: Props) {
  async function handleExport() {
    // Dynamic import agar xlsx tidak membesar bundle server
    const XLSX = await import("xlsx");

    const wb = XLSX.utils.book_new();

    for (const group of groups) {
      const sheetName = `${group.className} - ${group.subjectName}`.slice(0, 31);

      const rows: (string | number)[][] = [
        ["NIS", "Nama Siswa", "Rata-rata Assessment", "Rata-rata Project", "Nilai Akhir", "Keterangan"],
        ...group.rows.map((r) => [
          r.nis,
          r.studentName,
          r.assessmentAvg !== null ? r.assessmentAvg : "—",
          r.projectAvg !== null ? r.projectAvg : "—",
          r.finalGrade !== null ? r.finalGrade : "—",
          r.finalGrade !== null ? (r.finalGrade >= KKM ? "Tuntas" : "Belum Tuntas") : "—",
        ]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(rows);

      // Lebar kolom
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

    XLSX.writeFile(wb, `${filename}.xlsx`);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 hover:border-[#FF8833] hover:text-[#FF8833] transition-colors"
    >
      <Download size={15} />
      Export Excel
    </button>
  );
}

