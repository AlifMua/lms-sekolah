// src/app/siswa/project/page.tsx
import { StudentProjectClient } from "@/components/student/StudentProjectClient";
import { listStudentProjects, requireStudent } from "@/lib/student";

export default async function ProjectPage() {
  const student = await requireStudent();
  const { className, items } = await listStudentProjects(student.id);

  return <StudentProjectClient items={items} className={className} />;
}
