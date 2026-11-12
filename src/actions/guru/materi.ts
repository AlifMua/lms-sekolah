"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { connectDB } from "@/lib/mongodb";
import { getTeacherFromSession, getTeacherScope } from "@/lib/teacher";
import Material from "@/models/Material";

// ── Types ─────────────────────────────────────────────────────────────────────

export type MateriFormValues = {
  title: string;
  description: string;
  content: string;
  assignmentId: string;
  status: string;
};

export type MateriFormState = {
  error?: string;
  fieldErrors?: Partial<
    Record<"title" | "description" | "content" | "assignmentId" | "status", string[]>
  >;
  /** Nilai yang dikirim user, dikembalikan saat gagal agar form tidak kosong lagi. */
  values?: MateriFormValues;
  success?: boolean;
};

export type MateriActionResult = { error?: string; success?: boolean };

// ── Schema ────────────────────────────────────────────────────────────────────

const objectIdRegex = /^[a-f\d]{24}$/i;

const materiSchema = z.object({
  title: z.string().trim().min(3, "Judul minimal 3 karakter").max(150, "Judul maksimal 150 karakter"),
  description: z
    .string()
    .trim()
    .min(3, "Deskripsi minimal 3 karakter")
    .max(500, "Deskripsi maksimal 500 karakter"),
  content: z.string().trim().min(1, "Isi materi wajib diisi").max(50000, "Isi materi maksimal 50.000 karakter"),
  // ID penugasan mengajar (guru + mapel + kelas). Mapel/kelas/tahun ajaran
  // diturunkan dari sini di server, TIDAK diterima langsung dari client.
  assignmentId: z.string().regex(objectIdRegex, "Pilih mapel & kelas"),
  status: z.enum(["draft", "published"], { message: "Status tidak valid" }),
});

function readValues(formData: FormData): MateriFormValues {
  const str = (key: string) => {
    const v = formData.get(key);
    return typeof v === "string" ? v : "";
  };
  return {
    title: str("title"),
    description: str("description"),
    content: str("content"),
    assignmentId: str("assignmentId"),
    status: str("status"),
  };
}

const NOT_TEACHER = "Sesi tidak valid. Silakan login ulang sebagai guru.";

/**
 * Cari penugasan mengajar milik guru ini pada tahun ajaran aktif.
 * Inilah penjaga otorisasi: guru hanya boleh membuat materi untuk
 * kombinasi mapel+kelas yang memang ditugaskan kepadanya.
 */
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

// ── Actions ───────────────────────────────────────────────────────────────────

export async function createMateri(
  _prev: MateriFormState,
  formData: FormData,
): Promise<MateriFormState> {
  const teacher = await getTeacherFromSession();
  if (!teacher) return { error: NOT_TEACHER };

  const values = readValues(formData);
  const parsed = materiSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, values };
  const { title, description, content, assignmentId, status } = parsed.data;

  try {
    const resolved = await resolveAssignment(teacher.id, assignmentId);
    if ("error" in resolved) return { error: resolved.error, values };

    await Material.create({
      title,
      description,
      content,
      subject: resolved.assignment.subjectId,
      class: resolved.assignment.classId,
      teacher: teacher.id,
      academicYear: resolved.academicYearId,
      status,
      publishedAt: status === "published" ? new Date() : undefined,
    });
  } catch {
    return { error: "Gagal menyimpan materi. Coba lagi.", values };
  }

  revalidatePath("/guru/materi");
  revalidatePath("/guru");
  return { success: true };
}

export async function updateMateri(
  id: string,
  _prev: MateriFormState,
  formData: FormData,
): Promise<MateriFormState> {
  const teacher = await getTeacherFromSession();
  if (!teacher) return { error: NOT_TEACHER };
  if (!objectIdRegex.test(id)) return { error: "Materi tidak ditemukan." };

  const values = readValues(formData);
  const parsed = materiSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, values };
  const { title, description, content, assignmentId, status } = parsed.data;

  try {
    const resolved = await resolveAssignment(teacher.id, assignmentId);
    if ("error" in resolved) return { error: resolved.error, values };

    await connectDB();
    // Filter teacher: guru hanya bisa mengubah materi miliknya sendiri
    const material = await Material.findOne({ _id: id, teacher: teacher.id });
    if (!material) return { error: "Materi tidak ditemukan.", values };

    material.title = title;
    material.description = description;
    material.content = content;
    material.subject = resolved.assignment.subjectId;
    material.class = resolved.assignment.classId;
    material.academicYear = resolved.academicYearId;

    // publishedAt: set saat pertama kali terbit, dihapus saat kembali draft
    if (status === "published" && material.status !== "published") {
      material.publishedAt = new Date();
    } else if (status === "draft") {
      material.publishedAt = undefined;
    }
    material.status = status;

    await material.save();
  } catch {
    return { error: "Gagal memperbarui materi. Coba lagi.", values };
  }

  revalidatePath("/guru/materi");
  revalidatePath("/guru");
  return { success: true };
}

export async function setMateriStatus(
  id: string,
  status: "draft" | "published",
): Promise<MateriActionResult> {
  const teacher = await getTeacherFromSession();
  if (!teacher) return { error: NOT_TEACHER };
  if (!objectIdRegex.test(id) || (status !== "draft" && status !== "published")) {
    return { error: "Permintaan tidak valid." };
  }

  try {
    await connectDB();
    const updated = await Material.findOneAndUpdate(
      { _id: id, teacher: teacher.id },
      status === "published"
        ? { status, publishedAt: new Date() }
        : { status, $unset: { publishedAt: 1 } },
    );
    if (!updated) return { error: "Materi tidak ditemukan." };
  } catch {
    return { error: "Gagal mengubah status materi." };
  }

  revalidatePath("/guru/materi");
  revalidatePath("/guru");
  return { success: true };
}

export async function deleteMateri(id: string): Promise<MateriActionResult> {
  const teacher = await getTeacherFromSession();
  if (!teacher) return { error: NOT_TEACHER };
  if (!objectIdRegex.test(id)) return { error: "Materi tidak ditemukan." };

  try {
    await connectDB();
    const deleted = await Material.findOneAndDelete({ _id: id, teacher: teacher.id });
    if (!deleted) return { error: "Materi tidak ditemukan." };
  } catch {
    return { error: "Gagal menghapus materi." };
  }

  revalidatePath("/guru/materi");
  revalidatePath("/guru");
  return { success: true };
}
