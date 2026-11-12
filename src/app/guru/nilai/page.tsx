// src/app/guru/nilai/page.tsx
import { Card } from "@/components/ui/Card"
import { getTeacherGradebook } from "@/lib/teacher-grades"
import { getTeacherScope, requireTeacher } from "@/lib/teacher"
import { ExportExcelButton } from "@/components/shared/ExportExcelButton"

const fmt = (n: number | null) => (n === null ? "—" : String(n))
const KKM = 75

export default async function GuruNilai() {
  const teacher = await requireTeacher()
  const { academicYear, assignments } = await getTeacherScope(teacher.id)

  const groups = academicYear ? await getTeacherGradebook(teacher.id, academicYear.id, assignments) : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Nilai</h1>
          <p className="mt-0.5 text-sm text-neutral-500">
            {academicYear ? `Tahun ajaran ${academicYear.year} (${academicYear.semester}) · ` : ""}
            Rata-rata dihitung dari assessment dan project yang sudah dinilai.
          </p>
        </div>
        {groups.length > 0 && (
          <ExportExcelButton groups={groups} filename={`rekap-nilai-${academicYear?.year ?? "ta"}`} />
        )}
      </div>

      {groups.length === 0 ? (
        <Card className="p-6 text-sm text-neutral-500">
          {academicYear
            ? "Anda belum memiliki penugasan mengajar pada tahun ajaran aktif."
            : "Belum ada tahun ajaran aktif. Hubungi admin."}
        </Card>
      ) : (
        groups.map((g) => (
          <Card key={g.assignmentId} className="overflow-x-auto p-4">
            <h2 className="font-semibold text-neutral-900">
              {g.subjectName} — {g.className}
            </h2>
            <p className="mb-3 text-xs text-neutral-500">
              {g.assessmentCount} assessment · {g.projectCount} project
            </p>
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
  )
}
