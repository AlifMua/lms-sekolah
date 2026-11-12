// src/app/guru/materi/page.tsx
import { connectDB } from "@/lib/mongodb"
import { getTeacherScope, requireTeacher } from "@/lib/teacher"
import Material from "@/models/Material"
// Diimpor agar model terdaftar sebelum populate() dipanggil
import "@/models/Subject"
import "@/models/Class"
import { MateriPageClient } from "@/components/teacher/MateriPageClient"
import type { MateriItem } from "@/components/teacher/MateriDialog"

type RawMaterial = {
  _id: unknown
  title: string
  description: string
  content: string
  subject: { _id: unknown; name: string } | null
  class: { _id: unknown; name: string } | null
  status: "draft" | "published"
  publishedAt?: Date
  updatedAt: Date
}

export default async function GuruMateri() {
  const teacher = await requireTeacher()
  const { academicYear, assignments } = await getTeacherScope(teacher.id)

  let items: MateriItem[] = []

  if (academicYear) {
    await connectDB()

    // Hanya materi milik guru yang login pada tahun ajaran aktif
    const raw = await Material.find({ teacher: teacher.id, academicYear: academicYear.id })
      .populate("subject", "name")
      .populate("class", "name")
      .sort({ updatedAt: -1 })
      .lean<RawMaterial[]>()

    items = raw.map((m) => {
      const subjectId = m.subject ? String(m.subject._id) : ""
      const classId = m.class ? String(m.class._id) : ""
      // Cocokkan ke penugasan aktif; kosong jika admin sudah mencabutnya
      const match = assignments.find((a) => a.subjectId === subjectId && a.classId === classId)

      return {
        _id: String(m._id),
        title: m.title,
        description: m.description,
        content: m.content,
        assignmentId: match?.id ?? "",
        subjectName: m.subject?.name ?? "—",
        className: m.class?.name ?? "—",
        status: m.status,
        publishedAt: m.publishedAt ? m.publishedAt.toISOString() : null,
        updatedAt: m.updatedAt.toISOString(),
      }
    })
  }

  const assignmentOptions = assignments.map((a) => ({
    id: a.id,
    label: `${a.subjectName} — ${a.className}`,
  }))

  return (
    <MateriPageClient
      items={items}
      assignments={assignmentOptions}
      academicYearLabel={academicYear ? `${academicYear.year} (${academicYear.semester})` : null}
    />
  )
}
