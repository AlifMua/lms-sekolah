"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAdminFromSession } from "@/lib/admin";
import { connectDB } from "@/lib/mongodb";
import Announcement from "@/models/Announcement";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AnnouncementItem = {
  _id: string;
  title: string;
  content: string;
  authorName: string;
  targetRole: "all" | "teacher" | "student";
  pinned: boolean;
  createdAt: string;
};

export type AnnouncementResult = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

// ── Schema ────────────────────────────────────────────────────────────────────

const objectIdRegex = /^[a-f\d]{24}$/i;

const announcementSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Judul minimal 3 karakter")
    .max(200, "Judul maksimal 200 karakter"),
  content: z
    .string()
    .trim()
    .min(10, "Konten minimal 10 karakter")
    .max(5000, "Konten maksimal 5000 karakter"),
  targetRole: z.enum(["all", "teacher", "student"], {
    message: "Target penerima tidak valid",
  }),
  pinned: z.boolean().optional().default(false),
});

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

// ── Actions ───────────────────────────────────────────────────────────────────

/** Buat pengumuman baru (hanya admin). */
export async function createAnnouncement(
  _prev: AnnouncementResult,
  formData: FormData,
): Promise<AnnouncementResult> {
  const admin = await getAdminFromSession();
  if (!admin) return { success: false, error: "Sesi tidak valid. Silakan login ulang sebagai admin." };

  const raw = {
    title: str(formData, "title"),
    content: str(formData, "content"),
    targetRole: str(formData, "targetRole") as "all" | "teacher" | "student",
    pinned: formData.get("pinned") === "true",
  };
  const parsed = announcementSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await connectDB();
    await Announcement.create({ ...parsed.data, author: admin.id });
  } catch {
    return { success: false, error: "Gagal membuat pengumuman. Coba lagi." };
  }

  revalidatePath("/admin");
  revalidatePath("/guru");
  revalidatePath("/siswa");
  revalidatePath("/kepsek");
  return { success: true };
}

/** Hapus pengumuman (hanya admin). */
export async function deleteAnnouncement(id: string): Promise<AnnouncementResult> {
  if (!(await getAdminFromSession()))
    return { success: false, error: "Sesi tidak valid." };
  if (!objectIdRegex.test(id)) return { success: false, error: "ID tidak valid." };

  try {
    await connectDB();
    await Announcement.findByIdAndDelete(id);
  } catch {
    return { success: false, error: "Gagal menghapus pengumuman." };
  }

  revalidatePath("/admin");
  revalidatePath("/guru");
  revalidatePath("/siswa");
  revalidatePath("/kepsek");
  return { success: true };
}

/** Toggle pin pengumuman (hanya admin). */
export async function togglePinAnnouncement(id: string, pinned: boolean): Promise<AnnouncementResult> {
  if (!(await getAdminFromSession()))
    return { success: false, error: "Sesi tidak valid." };
  if (!objectIdRegex.test(id)) return { success: false, error: "ID tidak valid." };

  try {
    await connectDB();
    await Announcement.findByIdAndUpdate(id, { pinned });
  } catch {
    return { success: false, error: "Gagal mengubah status pin." };
  }

  revalidatePath("/admin");
  revalidatePath("/guru");
  revalidatePath("/siswa");
  revalidatePath("/kepsek");
  return { success: true };
}

/** Ambil pengumuman yang relevan untuk role tertentu (max 10 terbaru). */
export async function listAnnouncements(
  role?: "admin" | "teacher" | "student" | "principal",
): Promise<AnnouncementItem[]> {
  await connectDB();

  // Tentukan filter targetRole berdasarkan role user
  let targetFilter: object = {};
  if (role === "teacher") {
    targetFilter = { targetRole: { $in: ["all", "teacher"] } };
  } else if (role === "student") {
    targetFilter = { targetRole: { $in: ["all", "student"] } };
  }
  // admin dan principal melihat semua

  type RawAnnouncement = {
    _id: unknown;
    title: string;
    content: string;
    author: { username: string } | null;
    targetRole: "all" | "teacher" | "student";
    pinned: boolean;
    createdAt: Date;
  };

  // Pastikan model User terdaftar untuk populate
  await import("@/models/User");

  const docs = await Announcement.find(targetFilter)
    .populate("author", "username")
    .sort({ pinned: -1, createdAt: -1 })
    .limit(10)
    .lean<RawAnnouncement[]>();

  return docs.map((d) => ({
    _id: String(d._id),
    title: d.title,
    content: d.content,
    authorName: d.author?.username ?? "Admin",
    targetRole: d.targetRole,
    pinned: d.pinned,
    createdAt: d.createdAt.toISOString(),
  }));
}

