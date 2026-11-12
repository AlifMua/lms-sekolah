// src/app/guru/assessment/page.tsx
import { AssessmentPageClient } from "@/components/teacher/AssessmentPageClient"
import type { AssessmentItem } from "@/components/teacher/AssessmentDialog"
import { connectDB } from "@/lib/mongodb"
import { getTeacherScope, requireTeacher } from "@/lib/teacher"
import Assessment from "@/models/Assessment"
import AssessmentAttempt from "@/models/AssessmentAttempt"
import Question from "@/models/Question"
// Diimpor agar model terdaftar sebelum populate() dipanggil
import "@/models/Subject"
import "@/models/Class"

type RawAssessment = {
  _id: unknown
  title: string
  description: string
  subject: { _id: unknown; name: string } | null
  class: { _id: unknown; name: string } | null
  type: "quiz" | "uts" | "uas" | "tugas"
  duration: number
  startDate: Date
  endDate: Date
  status: "draft" | "active" | "closed"
}

export default async function GuruAssessment() {
  const teacher = await requireTeacher()
  const { academicYear, assignments } = await getTeacherScope(teacher.id)

  let items: AssessmentItem[] = []

  if (academicYear) {
    await connectDB()

    // Hanya assessment milik guru yang login pada tahun ajaran aktif
    const raw = await Assessment.find({ teacher: teacher.id, academicYear: academicYear.id })
      .populate("subject", "name")
      .populate("class", "name")
      .sort({ startDate: -1 })
      .lean<RawAssessment[]>()

    const ids = raw.map((a) => a._id)
    const [questionCounts, attemptCounts] = await Promise.all([
      Question.aggregate<{ _id: unknown; n: number }>([
        { $match: { assessment: { $in: ids } } },
        { $group: { _id: "$assessment", n: { $sum: 1 } } },
      ]),
      AssessmentAttempt.aggregate<{ _id: unknown; n: number }>([
        { $match: { assessment: { $in: ids } } },
        { $group: { _id: "$assessment", n: { $sum: 1 } } },
      ]),
    ])
    const qMap = new Map(questionCounts.map((c) => [String(c._id), c.n]))
    const aMap = new Map(attemptCounts.map((c) => [String(c._id), c.n]))

    items = raw.map((a) => {
      const subjectId = a.subject ? String(a.subject._id) : ""
      const classId = a.class ? String(a.class._id) : ""
      // Cocokkan ke penugasan aktif; kosong jika admin sudah mencabutnya
      const match = assignments.find((x) => x.subjectId === subjectId && x.classId === classId)

      return {
        _id: String(a._id),
        title: a.title,
        description: a.description,
        assignmentId: match?.id ?? "",
        subjectName: a.subject?.name ?? "—",
        className: a.class?.name ?? "—",
        type: a.type,
        duration: a.duration,
        startDate: a.startDate.toISOString(),
        endDate: a.endDate.toISOString(),
        status: a.status,
        questionCount: qMap.get(String(a._id)) ?? 0,
        attemptCount: aMap.get(String(a._id)) ?? 0,
      }
    })
  }

  const assignmentOptions = assignments.map((a) => ({
    id: a.id,
    label: `${a.subjectName} — ${a.className}`,
  }))

  return (
    <AssessmentPageClient
      items={items}
      assignments={assignmentOptions}
      academicYearLabel={academicYear ? `${academicYear.year} (${academicYear.semester})` : null}
    />
  )
}
