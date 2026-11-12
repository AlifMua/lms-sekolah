// src/app/siswa/riwayat/page.tsx
import { Card } from "@/components/ui/Card"
import { listStudentAssessments, listStudentProjects, requireStudent } from "@/lib/student"

const dt = (iso: string) => new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })

/** Waktu server saat halaman dirender (halaman ini dinamis karena bergantung pada session). */
function currentTime() {
  return Date.now()
}

export default async function RiwayatPage() {
  const student = await requireStudent()
  const [{ items: assessments }, { items: projects }] = await Promise.all([
    listStudentAssessments(student.id),
    listStudentProjects(student.id),
  ])
  const now = currentTime()

  // Riwayat = yang sudah dikerjakan, atau sudah lewat/ditutup
  const assessmentHistory = assessments
    .filter((a) => a.attemptState === "done" || a.assessmentStatus === "closed" || new Date(a.endDate).getTime() < now)
    .map((a) => ({
      id: a._id,
      title: a.title,
      subject: a.subjectName,
      teacher: a.teacherName,
      date: a.endDate,
      status:
        a.attemptState === "done"
          ? a.result?.pendingReview
            ? "Menunggu koreksi esai"
            : `Selesai · nilai ${a.result?.percent}`
          : "Tidak dikerjakan",
    }))

  const projectHistory = projects
    .filter((p) => p.submission || p.projectStatus === "closed" || p.isPastDeadline)
    .map((p) => ({
      id: p._id,
      title: p.title,
      subject: p.subjectName,
      teacher: p.teacherName,
      date: p.deadline,
      status: !p.submission
        ? "Tidak dikumpulkan"
        : p.submission.status === "graded"
          ? `Dinilai · ${p.submission.grade}`
          : p.submission.status === "revision"
            ? "Perlu revisi"
            : "Menunggu nilai",
    }))

  const sections = [
    { title: "Riwayat Assessment", rows: assessmentHistory, dateLabel: "Batas akhir" },
    { title: "Riwayat Project", rows: projectHistory, dateLabel: "Deadline" },
  ]

  return (
    <div className="space-y-6">
      {sections.map((s) => (
        <Card key={s.title} className="overflow-x-auto p-4">
          <h2 className="mb-2 text-lg font-semibold text-neutral-900">{s.title}</h2>
          {s.rows.length === 0 ? (
            <p className="text-sm text-neutral-500">Belum ada riwayat.</p>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Judul</th>
                  <th className="px-3 py-2 font-medium">Mapel</th>
                  <th className="px-3 py-2 font-medium">Guru</th>
                  <th className="px-3 py-2 font-medium">{s.dateLabel}</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {s.rows.map((r) => (
                  <tr key={r.id} className="border-b border-neutral-100">
                    <td className="px-3 py-2 text-neutral-800">{r.title}</td>
                    <td className="px-3 py-2 text-neutral-600">{r.subject}</td>
                    <td className="px-3 py-2 text-neutral-600">{r.teacher}</td>
                    <td className="px-3 py-2 text-neutral-600">{dt(r.date)}</td>
                    <td className="px-3 py-2 text-neutral-600">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      ))}
    </div>
  )
}
