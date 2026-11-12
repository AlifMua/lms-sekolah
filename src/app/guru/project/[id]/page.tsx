// src/app/guru/project/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";

import { SubmissionList, type SubmissionRow } from "@/components/teacher/SubmissionList";
import { Card } from "@/components/ui/Card";
import { connectDB } from "@/lib/mongodb";
import { requireTeacher } from "@/lib/teacher";
import Project from "@/models/Project";
import ProjectSubmission from "@/models/ProjectSubmission";
import StudentProfile from "@/models/StudentProfile";
// Diimpor agar model terdaftar sebelum populate() dipanggil
import "@/models/Subject";
import "@/models/Class";
import "@/models/User";

type Props = { params: Promise<{ id: string }> };

export default async function GuruProjectDetail({ params }: Props) {
  const { id } = await params;
  const teacher = await requireTeacher();
  if (!/^[a-f\d]{24}$/i.test(id)) notFound();

  await connectDB();

  // Filter teacher: guru hanya bisa membuka project miliknya sendiri
  const project = await Project.findOne({ _id: id, teacher: teacher.id })
    .populate("subject", "name")
    .populate("class", "name")
    .lean<{
      _id: unknown;
      title: string;
      description: string;
      subject: { name: string } | null;
      class: { _id: unknown; name: string } | null;
      deadline: Date;
      status: "active" | "closed";
    }>();
  if (!project) notFound();

  const [profiles, submissions] = await Promise.all([
    project.class
      ? StudentProfile.find({ class: project.class._id, isActive: { $ne: false } })
          .populate("user", "username")
          .lean<Array<{ nis: string; user: { _id: unknown; username: string } | null }>>()
      : Promise.resolve([]),
    ProjectSubmission.find({ project: id }).lean<
      Array<{
        _id: unknown;
        student: unknown;
        content: string;
        fileUrl?: string;
        submittedAt: Date;
        submissionStatus: "ontime" | "late";
        grade?: number;
        feedback?: string;
        status: "submitted" | "graded" | "revision";
      }>
    >(),
  ]);

  const subByStudent = new Map(submissions.map((s) => [String(s.student), s]));

  const rows: SubmissionRow[] = profiles
    .filter((p) => p.user)
    .map((p) => {
      const s = subByStudent.get(String(p.user!._id));
      return {
        studentName: p.user!.username,
        nis: p.nis,
        submission: s
          ? {
              _id: String(s._id),
              content: s.content,
              fileUrl: s.fileUrl ?? null,
              submittedAt: s.submittedAt.toISOString(),
              submissionStatus: s.submissionStatus,
              status: s.status,
              grade: s.grade ?? null,
              feedback: s.feedback ?? null,
            }
          : null,
      };
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName));

  return (
    <div className="space-y-4">
      <Link href="/guru/project" className="text-sm text-[#FF8833] hover:underline">
        ← Kembali ke daftar project
      </Link>
      <Card className="p-4">
        <h1 className="text-xl font-semibold text-neutral-900">{project.title}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {project.class?.name ?? "—"} · {project.subject?.name ?? "—"} · Deadline{" "}
          {project.deadline.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })} ·{" "}
          {project.status === "active" ? "Aktif" : "Ditutup"}
        </p>
        <p className="mt-3 whitespace-pre-line text-sm text-neutral-700">{project.description}</p>
      </Card>
      <SubmissionList rows={rows} />
    </div>
  );
}
