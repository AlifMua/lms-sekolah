// src/app/siswa/assessment/page.tsx
import Link from "next/link"
import { ClipboardList } from "lucide-react"

import { Card } from "@/components/ui/Card"
import { listStudentAssessments, requireStudent, type StudentAssessmentItem } from "@/lib/student"

const typeLabel = { quiz: "Kuis", uts: "UTS", uas: "UAS", tugas: "Tugas" } as const

function fmt(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
}

function stateBadge(a: StudentAssessmentItem): { text: string; cls: string } {
  if (a.attemptState === "done") {
    return a.result?.pendingReview
      ? { text: "Menunggu koreksi esai", cls: "bg-sky-50 text-sky-700" }
      : { text: "Selesai", cls: "bg-emerald-50 text-emerald-700" }
  }
  if (a.attemptState === "in-progress") return { text: "Sedang dikerjakan", cls: "bg-amber-50 text-amber-700" }
  if (a.assessmentStatus === "closed" || new Date(a.endDate) < new Date()) {
    return { text: "Ditutup", cls: "bg-neutral-100 text-neutral-600" }
  }
  if (new Date(a.startDate) > new Date()) return { text: "Belum dibuka", cls: "bg-neutral-100 text-neutral-600" }
  return { text: "Belum dikerjakan", cls: "bg-red-50 text-red-700" }
}

function actionLabel(a: StudentAssessmentItem) {
  if (a.attemptState === "done") return "Lihat hasil"
  if (a.attemptState === "in-progress") return "Lanjutkan"
  return "Buka"
}

export default async function AssessmentPage() {
  const student = await requireStudent()
  const { className, items } = await listStudentAssessments(student.id)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Assessment</h1>
        <p id="siswa-assessment-summary" className="mt-0.5 text-sm text-neutral-500">
          {className ? `Kelas ${className}` : "Kelas belum ditetapkan"} · {items.length} assessment
        </p>
      </div>

      {!className ? (
        <Card className="border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
          Akun Anda belum terhubung ke kelas mana pun. Hubungi admin.
        </Card>
      ) : items.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-16 text-neutral-400">
          <ClipboardList size={40} strokeWidth={1.5} />
          <p className="text-sm">Belum ada assessment untuk kelas Anda.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => {
            const badge = stateBadge(a)
            return (
              <Card key={a._id} data-testid="assessment-card" className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-neutral-900">{a.title}</h2>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}>
                    {badge.text}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm text-neutral-600">{a.description}</p>
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="rounded-md bg-[#FF8833]/10 px-2 py-0.5 font-semibold text-[#FF8833]">
                    {a.subjectName}
                  </span>
                  <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-neutral-600">{typeLabel[a.type]}</span>
                  <span className="text-neutral-500">{a.teacherName}</span>
                </div>
                <p className="text-xs text-neutral-500">
                  {a.questionCount} soal · {a.duration} menit
                </p>
                <p className="text-xs text-neutral-400">
                  {fmt(a.startDate)} → {fmt(a.endDate)}
                </p>
                {a.result && !a.result.pendingReview && (
                  <p className="text-sm font-medium text-neutral-800">
                    Nilai: {a.result.percent} ({a.result.totalScore}/{a.result.maxScore})
                  </p>
                )}
                <Link
                  href={`/siswa/assessment/${a._id}`}
                  className="mt-auto border-t border-neutral-100 pt-3 text-sm font-medium text-[#FF8833] hover:underline"
                >
                  {actionLabel(a)} →
                </Link>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
