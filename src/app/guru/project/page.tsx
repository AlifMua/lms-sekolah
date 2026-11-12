// src/app/guru/project/page.tsx
import { ProjectPageClient } from "@/components/teacher/ProjectPageClient";
import type { ProjectItem } from "@/components/teacher/ProjectDialog";
import { connectDB } from "@/lib/mongodb";
import { getTeacherScope, requireTeacher } from "@/lib/teacher";
import Project from "@/models/Project";
import ProjectSubmission from "@/models/ProjectSubmission";
import StudentProfile from "@/models/StudentProfile";
// Diimpor agar model terdaftar sebelum populate() dipanggil
import "@/models/Subject";
import "@/models/Class";

type RawProject = {
  _id: unknown;
  title: string;
  description: string;
  subject: { _id: unknown; name: string } | null;
  class: { _id: unknown; name: string } | null;
  deadline: Date;
  status: "active" | "closed";
};

export default async function GuruProject() {
  const teacher = await requireTeacher();
  const { academicYear, assignments } = await getTeacherScope(teacher.id);

  let items: ProjectItem[] = [];

  if (academicYear) {
    await connectDB();

    // Hanya project milik guru yang login pada tahun ajaran aktif
    const raw = await Project.find({ teacher: teacher.id, academicYear: academicYear.id })
      .populate("subject", "name")
      .populate("class", "name")
      .sort({ deadline: -1 })
      .lean<RawProject[]>();

    const projectIds = raw.map((p) => p._id);
    const classIds = [...new Set(raw.filter((p) => p.class).map((p) => String(p.class!._id)))];

    const [submissionCounts, studentCounts] = await Promise.all([
      ProjectSubmission.aggregate<{ _id: unknown; submitted: number; graded: number }>([
        { $match: { project: { $in: projectIds } } },
        {
          $group: {
            _id: "$project",
            submitted: { $sum: 1 },
            graded: { $sum: { $cond: [{ $eq: ["$status", "graded"] }, 1, 0] } },
          },
        },
      ]),
      StudentProfile.aggregate<{ _id: unknown; n: number }>([
        { $match: { class: { $in: raw.filter((p) => p.class).map((p) => p.class!._id) }, isActive: { $ne: false } } },
        { $group: { _id: "$class", n: { $sum: 1 } } },
      ]),
    ]);
    void classIds;
    const subMap = new Map(submissionCounts.map((s) => [String(s._id), s]));
    const stuMap = new Map(studentCounts.map((s) => [String(s._id), s.n]));

    items = raw.map((p) => {
      const subjectId = p.subject ? String(p.subject._id) : "";
      const classId = p.class ? String(p.class._id) : "";
      // Cocokkan ke penugasan aktif; kosong jika admin sudah mencabutnya
      const match = assignments.find((a) => a.subjectId === subjectId && a.classId === classId);
      const sub = subMap.get(String(p._id));

      return {
        _id: String(p._id),
        title: p.title,
        description: p.description,
        assignmentId: match?.id ?? "",
        subjectName: p.subject?.name ?? "—",
        className: p.class?.name ?? "—",
        deadline: p.deadline.toISOString(),
        status: p.status,
        submittedCount: sub?.submitted ?? 0,
        gradedCount: sub?.graded ?? 0,
        studentCount: stuMap.get(classId) ?? 0,
      };
    });
  }

  const assignmentOptions = assignments.map((a) => ({
    id: a.id,
    label: `${a.subjectName} — ${a.className}`,
  }));

  return (
    <ProjectPageClient
      items={items}
      assignments={assignmentOptions}
      academicYearLabel={academicYear ? `${academicYear.year} (${academicYear.semester})` : null}
    />
  );
}
