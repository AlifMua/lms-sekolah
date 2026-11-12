"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getAdminFromSession } from "@/lib/admin";
import { connectDB } from "@/lib/mongodb";
import { hashPassword, verifyPassword } from "@/lib/password";
import User from "@/models/User";
import SchoolSetting from "@/models/SchoolSetting";
import AcademicYear from "@/models/AcademicYear";
import Class from "@/models/Class";
import StudentProfile from "@/models/StudentProfile";
import TeacherProfile from "@/models/TeacherProfile";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ActionResult = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export type SchoolSettingData = {
  schoolName: string;
  npsn: string;
  address: string;
  phone: string;
  email: string;
  principalName: string;
};

export type SystemStats = {
  totalSiswaAktif: number;
  totalGuruAktif: number;
  totalKelas: number;
  tahunAjaranAktif: string | null;
};

// ── Schema ────────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter")
    .max(100, "Nama maksimal 100 karakter"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Format email tidak valid"),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Password lama wajib diisi"),
    newPassword: z
      .string()
      .min(6, "Password baru minimal 6 karakter")
      .max(72, "Password baru maksimal 72 karakter"),
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });

const schoolSettingSchema = z.object({
  schoolName: z
    .string()
    .trim()
    .min(3, "Nama sekolah minimal 3 karakter")
    .max(200, "Nama sekolah maksimal 200 karakter"),
  npsn: z.string().trim().max(20, "NPSN maksimal 20 karakter"),
  address: z.string().trim().max(500, "Alamat maksimal 500 karakter"),
  phone: z.string().trim().max(30, "Nomor telepon maksimal 30 karakter"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(100, "Email resmi maksimal 100 karakter")
    .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Format email tidak valid"),
  principalName: z
    .string()
    .trim()
    .max(100, "Nama kepala sekolah maksimal 100 karakter"),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

// ── Actions ───────────────────────────────────────────────────────────────────

/** Perbarui nama dan email profil pengguna yang sedang login (admin/guru/siswa). */
export async function updateProfile(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Sesi tidak valid. Silakan login ulang." };

  const raw = { name: str(formData, "name"), email: str(formData, "email") };
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };

  const { name, email } = parsed.data;

  try {
    await connectDB();

    // Cek email duplikat (kecuali user yang sama)
    const dup = await User.findOne({
      email,
      _id: { $ne: session.user.id },
    })
      .select("_id")
      .lean();
    if (dup)
      return { success: false, fieldErrors: { email: [`Email "${email}" sudah digunakan akun lain.`] } };

    await User.findByIdAndUpdate(session.user.id, { username: name, email });
  } catch {
    return { success: false, error: "Gagal memperbarui profil. Coba lagi." };
  }

  revalidatePath("/admin/pengaturan");
  revalidatePath("/guru");
  revalidatePath("/siswa");
  return { success: true };
}

/** Ganti password pengguna yang sedang login (semua role). */
export async function changePassword(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Sesi tidak valid. Silakan login ulang." };

  const raw = {
    currentPassword: str(formData, "currentPassword"),
    newPassword: str(formData, "newPassword"),
    confirmPassword: str(formData, "confirmPassword"),
  };
  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };

  const { currentPassword, newPassword } = parsed.data;

  try {
    await connectDB();
    const user = await User.findById(session.user.id).select("password").lean<{ password: string }>();
    if (!user) return { success: false, error: "Akun tidak ditemukan." };

    const isValid = await verifyPassword(currentPassword, user.password);
    if (!isValid)
      return { success: false, fieldErrors: { currentPassword: ["Password lama tidak sesuai."] } };

    const hashed = await hashPassword(newPassword);
    await User.findByIdAndUpdate(session.user.id, { password: hashed });
  } catch {
    return { success: false, error: "Gagal mengganti password. Coba lagi." };
  }

  return { success: true };
}

/** Simpan pengaturan profil sekolah (hanya admin). */
export async function saveSchoolSetting(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await getAdminFromSession()))
    return { success: false, error: "Sesi tidak valid. Silakan login ulang sebagai admin." };

  const raw = {
    schoolName: str(formData, "schoolName"),
    npsn: str(formData, "npsn"),
    address: str(formData, "address"),
    phone: str(formData, "phone"),
    email: str(formData, "email"),
    principalName: str(formData, "principalName"),
  };
  const parsed = schoolSettingSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await connectDB();
    // Upsert: satu dokumen SchoolSetting saja untuk seluruh sistem
    await SchoolSetting.findOneAndUpdate({}, parsed.data, { upsert: true, new: true });
  } catch {
    return { success: false, error: "Gagal menyimpan pengaturan sekolah. Coba lagi." };
  }

  revalidatePath("/admin/pengaturan");
  revalidatePath("/kepsek");
  return { success: true };
}

/** Baca pengaturan sekolah dari DB (atau default kosong bila belum ada). */
export async function getSchoolSetting(): Promise<SchoolSettingData> {
  await connectDB();
  const doc = await SchoolSetting.findOne({})
    .lean<{
      schoolName?: string;
      npsn?: string;
      address?: string;
      phone?: string;
      email?: string;
      principalName?: string;
    }>()
    .catch(() => null);

  return {
    schoolName: doc?.schoolName ?? "LMS Sekolah",
    npsn: doc?.npsn ?? "",
    address: doc?.address ?? "",
    phone: doc?.phone ?? "",
    email: doc?.email ?? "",
    principalName: doc?.principalName ?? "",
  };
}

/** Statistik sistem untuk tab ringkasan di pengaturan. */
export async function getSystemStats(): Promise<SystemStats> {
  await connectDB();
  void TeacherProfile;

  const [totalSiswaAktif, totalGuruAktif, totalKelas, activeYear] = await Promise.all([
    StudentProfile.countDocuments({ isActive: { $ne: false } }),
    User.countDocuments({ role: "teacher", isActive: { $ne: false } }),
    Class.countDocuments({}),
    AcademicYear.findOne({ isActive: true }).lean<{ year: string; semester: string }>(),
  ]);

  return {
    totalSiswaAktif,
    totalGuruAktif,
    totalKelas,
    tahunAjaranAktif: activeYear ? `${activeYear.year} (${activeYear.semester})` : null,
  };
}

