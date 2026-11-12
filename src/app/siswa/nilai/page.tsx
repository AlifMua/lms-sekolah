// src/app/siswa/nilai/page.tsx
import { Card } from "@/components/ui/Card"
import { summarizeBySubject, type ScoreItem } from "@/lib/grades"
import { listStudentAssessments, listStudentProjects, requireStudent } from "@/lib/student"

const fmt = (n: number | null) => (n === null ? "—" : String(n))

export default async function NilaiPage() {
  const student = await requireStudent()
  const [{ items: assessments }, { items: projects }] = await Promise.all([
    listStudentAssessments(student.id),
    listStudentProjects(student.id),
  ])

  // Assessment dengan esai yang belum dikoreksi → belum bernilai
  const details = [
    ...assessments
      .filter((a) => a.attemptState === "done")
      .map((a) => ({
        id: a._id,
        subject: a.subjectName,
        kind: "assessment" as const,
        title: a.title,
        teacher: a.teacherName,
        score: a.result && !a.result.pendingReview ? a.result.percent : null,
        pending: !!a.result?.pendingReview,
      })),
    ...projects
      .filter((p) => p.submission)
      .map((p) => ({
        id: p._id,
        subject: p.subjectName,
        kind: "project" as const,
        title: p.title,
        teacher: p.teacherName,
        score: p.submission!.status === "graded" ? p.submission!.grade : null,
        pending: p.submission!.status !== "graded",
      })),
  ].sort((a, b) => a.subject.localeCompare(b.subject) || a.title.localeCompare(b.title))

  const scoreItems: ScoreItem[] = details.map((d) => ({ subject: d.subject, kind: d.kind, score: d.score }))
  const summary = summarizeBySubject(scoreItems)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Nilai</h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          Dihitung dari assessment dan project yang sudah dinilai. Nilai akhir = rata-rata assessment dan
          project.
        </p>
      </div>

      <Card className="overflow-x-auto p-4">
        <h2 className="mb-3 text-lg font-semibold text-neutral-900">Rekap per Mata Pelajaran</h2>
        {summary.length === 0 ? (
          <p className="text-sm text-neutral-500">Belum ada nilai.</p>
        ) : (
          <table id="rekap-nilai" className="min-w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-3 py-2 font-medium">Mata Pelajaran</th>
                <th className="px-3 py-2 font-medium">Assessment</th>
                <th className="px-3 py-2 font-medium">Project</th>
                <th className="px-3 py-2 font-medium">Nilai Akhir</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((s) => (
                <tr key={s.subject} className="border-b border-neutral-100">
                  <td className="px-3 py-2 text-neutral-800">{s.subject}</td>
                  <td className="px-3 py-2 text-neutral-600">{fmt(s.assessmentAvg)}</td>
                  <td className="px-3 py-2 text-neutral-600">{fmt(s.projectAvg)}</td>
                  <td className="px-3 py-2 font-semibold text-neutral-900">{fmt(s.finalGrade)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="overflow-x-auto p-4">
        <h2 className="mb-3 text-lg font-semibold text-neutral-900">Rincian</h2>
        {details.length === 0 ? (
          <p className="text-sm text-neutral-500">Belum ada assessment atau project yang dikumpulkan.</p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-3 py-2 font-medium">Mata Pelajaran</th>
                <th className="px-3 py-2 font-medium">Tipe</th>
                <th className="px-3 py-2 font-medium">Judul</th>
                <th className="px-3 py-2 font-medium">Nilai</th>
                <th className="px-3 py-2 font-medium">Guru</th>
              </tr>
            </thead>
            <tbody>
              {details.map((d) => (
                <tr key={`${d.kind}-${d.id}`} className="border-b border-neutral-100">
                  <td className="px-3 py-2 text-neutral-600">{d.subject}</td>
                  <td className="px-3 py-2 text-neutral-600">{d.kind === "assessment" ? "Assessment" : "Project"}</td>
                  <td className="px-3 py-2 text-neutral-600">{d.title}</td>
                  <td className="px-3 py-2 text-neutral-800">
                    {d.score !== null ? d.score : d.pending ? "Menunggu penilaian" : "—"}
                  </td>
                  <td className="px-3 py-2 text-neutral-600">{d.teacher}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
