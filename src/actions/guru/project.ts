"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { connectDB } from "@/lib/mongodb";
import { parseLocalDateTime as parseDeadline } from "@/lib/datetime";
import { getTeacherFromSession, getTeacherScope } from "@/lib/teacher";
import Project from "@/models/Project";
import ProjectSubmission from "@/models/ProjectSubmission";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ProjectFormValues = {
  title: string;
  description: string;
  assignmentId: string;
  deadline: string;
  status: string;
};

export type ProjectFormState = {
  error?: string;
  fieldErrors?: Partial<
    Record<"title" | "description" | "assignmentId" | "deadline" | "status", string[]>
  >;
  values?: ProjectFormValues;
  success?: boolean;
};

export type ProjectActionResult = { error?: string; success?: boolean };

// ── Schema ────────────────────────────────────────────────────────────────────

const objectIdRegex = /^[a-f\d]{24}$/i;
const NOT_TEACHER = "Sesi tidak valid. Silakan login ulang sebagai guru.";

const projectSchema = z.object({
  title: z.string().trim().min(3, "Judul minimal 3 karakter").max(150, "Judul maksimal 150 karakter"),
  description: z
    .string()
    .trim()
    .min(3, "Deskripsi minimal 3 karakter")
    .max(5000, "Deskripsi maksimal 5.000 karakter"),
  assignmentId: z.string().regex(objectIdRegex, "Pilih mapel & kelas"),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Deadline wajib diisi"),
  status: z.enum(["active", "closed"], { message: "Status tidak valid" }),
});

function readValues(formData: FormData): ProjectFormValues {
  const str = (key: string) => {
    const v = formData.get(key);
    return typeof v === "string" ? v : "";
  };
  return {
    title: str("title"),
    description: str("description"),
    assignmentId: str("assignmentId"),
    deadline: str("deadline"),
    status: str("status"),
  };
}

/** Penjaga otorisasi: guru hanya boleh membuat project untuk mapel+kelas yang ditugaskan. */
async function resolveAssignment(teacherId: string, assignmentId: string) {
  const scope = await getTeacherScope(teacherId);
  if (!scope.academicYear) {
    return { error: "Belum ada tahun ajaran aktif. Hubungi admin." } as const;
  }
  const assignment = scope.assignments.find((a) => a.id === assignmentId);
  if (!assignment) {
    return {
      error: "Anda tidak ditugaskan mengajar mapel & kelas tersebut pada tahun ajaran aktif.",
    } as const;
  }
  return { assignment, academicYearId: scope.academicYear.id } as const;
}

// ── Project CRUD ──────────────────────────────────────────────────────────────

export async function createProject(
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const teacher = await getTeacherFromSession();
  if (!teacher) return { error: NOT_TEACHER };

  const values = readValues(formData);
  const parsed = projectSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, values };
  const { title, description, assignmentId, deadline, status } = parsed.data;

  const deadlineDate = parseDeadline(deadline, formData.get("tzOffset"));
  if (!deadlineDate) return { fieldErrors: { deadline: ["Deadline tidak valid"] }, values };

  try {
    const resolved = await resolveAssignment(teacher.id, assignmentId);
    if ("error" in resolved) return { error: resolved.error, values };

    await Project.create({
      title,
      description,
      subject: resolved.assignment.subjectId,
      class: resolved.assignment.classId,
      teacher: teacher.id,
      academicYear: resolved.academicYearId,
      deadline: deadlineDate,
      status,
    });
  } catch {
    return { error: "Gagal menyimpan project. Coba lagi.", values };
  }

  revalidatePath("/guru/project");
  revalidatePath("/siswa/project");
  return { success: true };
}

export async function updateProject(
  id: string,
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const teacher = await getTeacherFromSession();
  if (!teacher) return { error: NOT_TEACHER };
  if (!objectIdRegex.test(id)) return { error: "Project tidak ditemukan." };

  const values = readValues(formData);
  const parsed = projectSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, values };
  const { title, description, assignmentId, deadline, status } = parsed.data;

  const deadlineDate = parseDeadline(deadline, formData.get("tzOffset"));
  if (!deadlineDate) return { fieldErrors: { deadline: ["Deadline tidak valid"] }, values };

  try {
    const resolved = await resolveAssignment(teacher.id, assignmentId);
    if ("error" in resolved) return { error: resolved.error, values };

    await connectDB();
    // Filter teacher: guru hanya bisa mengubah project miliknya sendiri
    const project = await Project.findOne({ _id: id, teacher: teacher.id });
    if (!project) return { error: "Project tidak ditemukan.", values };

    project.title = title;
    project.description = description;
    project.subject = resolved.assignment.subjectId;
    project.class = resolved.assignment.classId;
    project.academicYear = resolved.academicYearId;
    project.deadline = deadlineDate;
    project.status = status;
    await project.save();
  } catch {
    return { error: "Gagal memperbarui project. Coba lagi.", values };
  }

  revalidatePath("/guru/project");
  revalidatePath(`/guru/project/${id}`);
  revalidatePath("/siswa/project");
  return { success: true };
}

export async function setProjectStatus(
  id: string,
  status: "active" | "closed",
): Promise<ProjectActionResult> {
  const teacher = await getTeacherFromSession();
  if (!teacher) return { error: NOT_TEACHER };
  if (!objectIdRegex.test(id) || (status !== "active" && status !== "closed")) {
    return { error: "Permintaan tidak valid." };
  }

  try {
    await connectDB();
    const updated = await Project.findOneAndUpdate({ _id: id, teacher: teacher.id }, { status });
    if (!updated) return { error: "Project tidak ditemukan." };
  } catch {
    return { error: "Gagal mengubah status project." };
  }

  revalidatePath("/guru/project");
  revalidatePath("/siswa/project");
  return { success: true };
}

export async function deleteProject(id: string): Promise<ProjectActionResult> {
  const teacher = await getTeacherFromSession();
  if (!teacher) return { error: NOT_TEACHER };
  if (!objectIdRegex.test(id)) return { error: "Project tidak ditemukan." };

  try {
    await connectDB();
    const deleted = await Project.findOneAndDelete({ _id: id, teacher: teacher.id });
    if (!deleted) return { error: "Project tidak ditemukan." };
    // Jangan tinggalkan pengumpulan yatim
    await ProjectSubmission.deleteMany({ project: id });
  } catch {
    return { error: "Gagal menghapus project." };
  }

  revalidatePath("/guru/project");
  revalidatePath("/siswa/project");
  return { success: true };
}

// ── Penilaian ─────────────────────────────────────────────────────────────────

export type GradeFormState = { error?: string; success?: boolean };

const gradeSchema = z.object({
  grade: z.string().trim(),
  feedback: z.string().trim().max(2000, "Feedback maksimal 2.000 karakter"),
  decision: z.enum(["graded", "revision"], { message: "Keputusan tidak valid" }),
});

/**
 * Beri nilai / minta revisi untuk satu pengumpulan. Kepemilikan dicek lewat
 * project.teacher (bukan dari input client).
 */
export async function gradeSubmission(
  submissionId: string,
  _prev: GradeFormState,
  formData: FormData,
): Promise<GradeFormState> {
  const teacher = await getTeacherFromSession();
  if (!teacher) return { error: NOT_TEACHER };
  if (!objectIdRegex.test(submissionId)) return { error: "Pengumpulan tidak ditemukan." };

  const parsed = gradeSchema.safeParse({
    grade: formData.get("grade") ?? "",
    feedback: formData.get("feedback") ?? "",
    decision: formData.get("decision"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Input tidak valid." };
  const { feedback, decision } = parsed.data;

  // Nilai wajib saat "graded"; opsional saat meminta revisi
  let grade: number | undefined;
  if (parsed.data.grade !== "") {
    grade = Number(parsed.data.grade);
    if (!Number.isFinite(grade) || grade < 0 || grade > 100) {
      return { error: "Nilai harus berupa angka 0–100." };
    }
  } else if (decision === "graded") {
    return { error: "Nilai wajib diisi." };
  }

  try {
    await connectDB();
    const submission = await ProjectSubmission.findById(submissionId);
    if (!submission) return { error: "Pengumpulan tidak ditemukan." };

    const project = await Project.findOne({ _id: submission.project, teacher: teacher.id }).select("_id");
    if (!project) return { error: "Pengumpulan tidak ditemukan." };

    submission.grade = grade;
    submission.feedback = feedback || undefined;
    submission.status = decision;
    await submission.save();

    revalidatePath(`/guru/project/${String(project._id)}`);
    revalidatePath("/guru/project");
    revalidatePath("/siswa/project");
  } catch {
    return { error: "Gagal menyimpan nilai. Coba lagi." };
  }

  return { success: true };
}
