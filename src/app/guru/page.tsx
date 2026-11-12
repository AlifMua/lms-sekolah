// src/app/guru/page.tsx
import { Card } from "@/components/ui/Card"
import { connectDB } from "@/lib/mongodb"
import { getTeacherScope, requireTeacher } from "@/lib/teacher"
import Material from "@/models/Material"
import Assessment from "@/models/Assessment"
import Project from "@/models/Project"
import StudentProfile from "@/models/StudentProfile"
import Class from "@/models/Class"
import { listAnnouncements } from "@/actions/admin/announcement"
import { AnnouncementWidget } from "@/components/shared/AnnouncementWidget"

export default async function GuruDashboard() {
  const teacher = await requireTeacher()
  const { academicYear, assignments } = await getTeacherScope(teacher.id)

  await connectDB()

  const classIds = [...new Set(assignments.map((a) => a.classId))]
  const subjectIds = new Set(assignments.map((a) => a.subjectId))

  // Semua query difilter oleh identitas guru dari session + tahun ajaran aktif
  const yearFilter = academicYear ? { academicYear: academicYear.id } : null

  const [jumlahSiswa, jumlahMateri, jumlahAssessment, jumlahProject, waliKelas, announcements] =
    await Promise.all([
      classIds.length > 0
        ? StudentProfile.countDocuments({ class: { $in: classIds }, isActive: true })
        : 0,
      yearFilter
        ? Material.countDocuments({ teacher: teacher.id, status: "published", ...yearFilter })
        : 0,
      yearFilter
        ? Assessment.countDocuments({ teacher: teacher.id, status: "active", ...yearFilter })
        : 0,
      yearFilter
        ? Project.countDocuments({ teacher: teacher.id, status: "active", ...yearFilter })
        : 0,
      yearFilter
        ? Class.findOne({ homeroomTeacher: teacher.id, ...yearFilter })
            .select("name")
            .lean<{ name: string }>()
        : null,
      listAnnouncements("teacher"),
    ])

  // Kelompokkan penugasan per kelas untuk ditampilkan
  const mapelPerKelas = new Map<string, string[]>()
  for (const a of assignments) {
    const list = mapelPerKelas.get(a.className) ?? []
    list.push(a.subjectName)
    mapelPerKelas.set(a.className, list)
  }

  const stats = [
    { label: "Jumlah Kelas", value: classIds.length },
    { label: "Mata Pelajaran", value: subjectIds.size },
    { label: "Jumlah Siswa", value: jumlahSiswa },
    { label: "Materi Aktif", value: jumlahMateri },
    { label: "Assessment Aktif", value: jumlahAssessment },
    { label: "Project Aktif", value: jumlahProject },
  ]

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold text-neutral-900 mb-2">
          Selamat datang, {teacher.name}
        </h2>
        {academicYear ? (
          <p className="text-sm text-neutral-600">
            <strong>Tahun ajaran aktif:</strong> {academicYear.year} ({academicYear.semester})
          </p>
        ) : (
          <p className="text-sm text-red-600">
            Belum ada tahun ajaran aktif. Hubungi admin untuk mengaktifkannya.
          </p>
        )}
        {waliKelas && (
          <p className="text-sm text-neutral-600">
            <strong>Wali kelas:</strong> {waliKelas.name}
          </p>
        )}
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((item) => (
          <Card key={item.label} className="p-4 text-center bg-[#FF8833]/10 text-[#FF8833]">
            <p className="font-medium">{item.label}</p>
            <p className="text-2xl">{item.value}</p>
          </Card>
        ))}
      </div>

      {/* Pengumuman */}
      <AnnouncementWidget items={announcements} />

      {/* Daftar penugasan mengajar */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold text-neutral-900 mb-3">Kelas &amp; Mapel yang Diajar</h2>
        {mapelPerKelas.size === 0 ? (
          <p className="text-sm text-neutral-500">
            Anda belum memiliki penugasan mengajar pada tahun ajaran aktif. Hubungi admin untuk
            ditugaskan ke kelas dan mata pelajaran.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {[...mapelPerKelas.entries()].map(([kelas, mapel]) => (
              <li
                key={kelas}
                className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-medium text-neutral-800">{kelas}</span>
                <span className="text-sm text-neutral-600">{mapel.join(", ")}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
