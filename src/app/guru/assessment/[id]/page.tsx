// src/app/guru/assessment/[id]/page.tsx
import Link from "next/link"
import { notFound } from "next/navigation"

import { AttemptList, type AttemptRow } from "@/components/teacher/AttemptList"
import { QuestionManager, type QuestionItem } from "@/components/teacher/QuestionManager"
import { assessmentTypeLabel } from "@/components/teacher/AssessmentDialog"
import { Card } from "@/components/ui/Card"
import { toPercent } from "@/lib/assessment"
import { connectDB } from "@/lib/mongodb"
import { requireTeacher } from "@/lib/teacher"
import Assessment from "@/models/Assessment"
import AssessmentAttempt from "@/models/AssessmentAttempt"
import Question from "@/models/Question"
import StudentProfile from "@/models/StudentProfile"
// Diimpor agar model terdaftar sebelum populate() dipanggil
import "@/models/Subject"
import "@/models/Class"
import "@/models/User"

type Props = { params: Promise<{ id: string }> }

const statusText = { draft: "Draft", active: "Aktif", closed: "Ditutup" } as const

export default async function GuruAssessmentDetail({ params }: Props) {
  const { id } = await params
  const teacher = await requireTeacher()
  if (!/^[a-f\d]{24}$/i.test(id)) notFound()

  await connectDB()

  // Filter teacher: guru hanya bisa membuka assessment miliknya sendiri
  const assessment = await Assessment.findOne({ _id: id, teacher: teacher.id })
    .populate("subject", "name")
    .populate("class", "name")
    .lean<{
      _id: unknown
      title: string
      description: string
      subject: { name: string } | null
      class: { _id: unknown; name: string } | null
      type: "quiz" | "uts" | "uas" | "tugas"
      duration: number
      startDate: Date
      endDate: Date
      status: "draft" | "active" | "closed"
    }>()
  if (!assessment) notFound()

  const [questions, attempts, profiles] = await Promise.all([
    Question.find({ assessment: id })
      .sort({ order: 1 })
      .lean<
        Array<{
          _id: unknown
          questionType: QuestionItem["questionType"]
          questionText: string
          options: { label: string; text: string }[]
          correctAnswer: string
          points: number
          order: number
        }>
      >(),
    AssessmentAttempt.find({ assessment: id }).lean<
      Array<{
        _id: unknown
        student: unknown
        answers: Array<{ question: unknown; answer: string; isCorrect?: boolean; points: number }>
        totalScore: number
        maxScore: number
        submittedAt?: Date
        status: AttemptRow["status"]
      }>
    >(),
    assessment.class
      ? StudentProfile.find({ class: assessment.class._id, isActive: { $ne: false } })
          .populate("user", "username")
          .lean<Array<{ nis: string; user: { _id: unknown; username: string } | null }>>()
      : Promise.resolve([]),
  ])

  const qMap = new Map(questions.map((q) => [String(q._id), q]))
  const profileByUser = new Map(
    profiles.filter((p) => p.user).map((p) => [String(p.user!._id), p]),
  )

  const questionItems: QuestionItem[] = questions.map((q) => ({
    _id: String(q._id),
    questionType: q.questionType,
    questionText: q.questionText,
    options: q.options,
    correctAnswer: q.correctAnswer,
    points: q.points,
    order: q.order,
  }))

  const rows: AttemptRow[] = attempts
    .map((a) => {
      const profile = profileByUser.get(String(a.student))
      const essays = a.answers
        .map((e) => ({ entry: e, q: qMap.get(String(e.question)) }))
        .filter((x) => x.q && x.q.questionType === "essay" && x.entry.answer.trim() !== "")
        .map(({ entry, q }) => ({
          questionId: String(entry.question),
          order: q!.order,
          questionText: q!.questionText,
          maxPoints: q!.points,
          answer: entry.answer,
          points: entry.points,
          // isCorrect undefined = belum dikoreksi guru
          graded: entry.isCorrect !== undefined && entry.isCorrect !== null,
        }))
        .sort((x, y) => x.order - y.order)

      return {
        attemptId: String(a._id),
        studentName: profile?.user?.username ?? "Siswa (tidak aktif)",
        nis: profile?.nis ?? "—",
        status: a.status,
        totalScore: a.totalScore,
        maxScore: a.maxScore,
        percent: toPercent(a.totalScore, a.maxScore),
        submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,
        essays,
      }
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName))

  const fmt = (d: Date) => d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })

  return (
    <div className="space-y-6">
      <Link href="/guru/assessment" className="text-sm text-[#FF8833] hover:underline">
        ← Kembali ke daftar assessment
      </Link>

      <Card className="p-4">
        <h1 className="text-xl font-semibold text-neutral-900">{assessment.title}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {assessment.class?.name ?? "—"} · {assessment.subject?.name ?? "—"} ·{" "}
          {assessmentTypeLabel[assessment.type]} · {assessment.duration} menit ·{" "}
          {statusText[assessment.status]}
        </p>
        <p className="mt-1 text-xs text-neutral-400">
          {fmt(assessment.startDate)} → {fmt(assessment.endDate)}
        </p>
        <p className="mt-3 whitespace-pre-line text-sm text-neutral-700">{assessment.description}</p>
      </Card>

      <QuestionManager assessmentId={id} questions={questionItems} locked={attempts.length > 0} />
      <AttemptList rows={rows} studentCount={profiles.length} />
    </div>
  )
}
