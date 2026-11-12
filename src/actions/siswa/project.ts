"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { connectDB } from "@/lib/mongodb";
import AcademicYear from "@/models/AcademicYear";
import Project from "@/models/Project";
import ProjectSubmission from "@/models/ProjectSubmission";
import StudentProfile from "@/models/StudentProfile";
import User from "@/models/User";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

export type SubmitProjectState = { error?: string; success?: boolean };

const objectIdRegex = /^[a-f\d]{24}$/i;

const submitSchema = z.object({
  content: z
    .string()
    .trim()
    .min(3, "Isi pengumpulan minimal 3 karakter")
    .max(10000, "Isi pengumpulan maksimal 10.000 karakter"),
  fileUrl: z
    .string()
    .trim()
    .max(500, "Link maksimal 500 karakter")
    .refine(
      (v) => v === "" || /^https?:\/\/\S+$/i.test(v) || v.startsWith("/uploads/"),
      "Link harus diawali http://, https://, atau hasil upload file"
    ),
});

async function getStudentFromSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "student") return null;
  await connectDB();
  const user = await User.findById(session.user.id).select("isActive").lean<{ isActive?: boolean }>();
  if (!user || user.isActive === false) return null;
  return { id: session.user.id };
}

/**
 * Kumpulkan (atau perbarui, selama belum dinilai) project.
 * Otorisasi: project harus milik KELAS siswa ini pada tahun ajaran aktif, dan
 * berstatus "active". Siswa tidak bisa memilih kelas/siswa lain dari client.
 */
export async function submitProject(
  projectId: string,
  _prev: SubmitProjectState,
  formData: FormData,
): Promise<SubmitProjectState> {
  const student = await getStudentFromSession();
  if (!student) return { error: "Sesi tidak valid. Silakan login ulang sebagai siswa." };
  if (!objectIdRegex.test(projectId)) return { error: "Project tidak ditemukan." };

  const parsed = submitSchema.safeParse({
    content: formData.get("content") ?? "",
    fileUrl: formData.get("fileUrl") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Input tidak valid." };
  const { content, fileUrl } = parsed.data;

  try {
    const [profile, activeYear] = await Promise.all([
      StudentProfile.findOne({ user: student.id, isActive: { $ne: false } }).lean<{ class: unknown }>(),
      AcademicYear.findOne({ isActive: true }).lean<{ _id: unknown }>(),
    ]);
    if (!profile || !activeYear) return { error: "Project tidak ditemukan." };

    const project = await Project.findOne({
      _id: projectId,
      class: profile.class,
      academicYear: activeYear._id,
    }).lean<{ _id: unknown; status: "active" | "closed" }>();
    if (!project) return { error: "Project tidak ditemukan." };
    if (project.status !== "active") return { error: "Project ini sudah ditutup oleh guru." };

    const existing = await ProjectSubmission.findOne({ project: projectId, student: student.id });
    if (existing) {
      if (existing.status === "graded") {
        return { error: "Pengumpulan sudah dinilai dan tidak bisa diubah." };
      }
      existing.content = content;
      existing.fileUrl = fileUrl || undefined;
      // Revisi dikumpulkan ulang → kembali menunggu penilaian
      existing.status = "submitted";
      await existing.save();
    } else {
      await ProjectSubmission.create({
        project: projectId,
        student: student.id,
        content,
        fileUrl: fileUrl || undefined,
        submittedAt: new Date(),
      });
    }
  } catch {
    return { error: "Gagal mengumpulkan project. Coba lagi." };
  }

  revalidatePath("/siswa/project");
  revalidatePath(`/guru/project/${projectId}`);
  return { success: true };
}
