"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAdminFromSession } from "@/lib/admin";
import { connectDB } from "@/lib/mongodb";
import { hashPassword } from "@/lib/password";
import User from "@/models/User";
import TeacherProfile from "@/models/TeacherProfile";

// ── Types ─────────────────────────────────────────────────────────────────────

export type GuruFormValues = {
  name: string;
  email: string;
  nip: string;
  specialization: string;
};

export type GuruFormState = {
  error?: string;
  fieldErrors?: Partial<
    Record<"name" | "email" | "nip" | "specialization" | "password", string[]>
  >;
  /** Nilai yang dikirim admin (tanpa password), dikembalikan agar form tidak kosong saat gagal. */
  values?: GuruFormValues;
  success?: boolean;
};

export type GuruActionResult = { error?: string; success?: boolean };

// ── Schema ────────────────────────────────────────────────────────────────────

const objectIdRegex = /^[a-f\d]{24}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOT_ADMIN = "Sesi tidak valid. Silakan login ulang sebagai admin.";

const baseSchema = z.object({
  name: z.string().trim().min(3, "Nama minimal 3 karakter").max(100, "Nama maksimal 100 karakter"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => EMAIL_RE.test(v), "Format email tidak valid"),
  nip: z
    .string()
    .trim()
    .min(5, "NIP minimal 5 digit")
    .max(30, "NIP maksimal 30 digit")
    .regex(/^\d+$/, "NIP hanya boleh berisi angka"),
  specialization: z.string().trim().max(100, "Spesialisasi maksimal 100 karakter"),
});

const createSchema = baseSchema.extend({
  password: z.string().min(6, "Password minimal 6 karakter").max(72, "Password maksimal 72 karakter"),
});

// Saat edit, password boleh kosong (= tidak diubah)
const updateSchema = baseSchema.extend({
  password: z
    .string()
    .max(72, "Password maksimal 72 karakter")
    .refine((v) => v === "" || v.length >= 6, "Password minimal 6 karakter"),
});

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

function readRaw(formData: FormData) {
  return {
    name: str(formData, "name"),
    email: str(formData, "email"),
    nip: str(formData, "nip"),
    specialization: str(formData, "specialization"),
    password: str(formData, "password"),
  };
}

function valuesOf(raw: ReturnType<typeof readRaw>): GuruFormValues {
  return { name: raw.name, email: raw.email, nip: raw.nip, specialization: raw.specialization };
}

/** Cek email & NIP sudah dipakai (mengabaikan guru yang sedang diedit). */
async function findDuplicates(email: string, nip: string, excludeUserId?: string) {
  const [userDup, nipDup] = await Promise.all([
    User.findOne({ email, ...(excludeUserId ? { _id: { $ne: excludeUserId } } : {}) })
      .select("_id")
      .lean(),
    TeacherProfile.findOne({ nip, ...(excludeUserId ? { user: { $ne: excludeUserId } } : {}) })
      .select("_id")
      .lean(),
  ]);
  const fieldErrors: NonNullable<GuruFormState["fieldErrors"]> = {};
  if (userDup) fieldErrors.email = [`Email "${email}" sudah terdaftar.`];
  if (nipDup) fieldErrors.nip = [`NIP "${nip}" sudah terdaftar.`];
  return Object.keys(fieldErrors).length ? fieldErrors : null;
}

/** Terjemahkan error duplicate-key MongoDB (race condition) menjadi pesan per-field. */
function duplicateKeyErrors(err: unknown, email: string, nip: string): GuruFormState["fieldErrors"] | null {
  const e = err as { code?: number; keyPattern?: Record<string, unknown>; message?: string };
  if (e?.code !== 11000) return null;
  const key = Object.keys(e.keyPattern ?? {})[0] ?? (e.message?.includes("nip") ? "nip" : "email");
  return key === "nip"
    ? { nip: [`NIP "${nip}" sudah terdaftar.`] }
    : { email: [`Email "${email}" sudah terdaftar.`] };
}

// ── Actions ───────────────────────────────────────────────────────────────────

export async function createGuru(_prev: GuruFormState, formData: FormData): Promise<GuruFormState> {
  if (!(await getAdminFromSession())) return { error: NOT_ADMIN };

  const raw = readRaw(formData);
  const values = valuesOf(raw);
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, values };
  const { name, email, nip, specialization, password } = parsed.data;

  let createdUserId: unknown;
  try {
    await connectDB();

    const dup = await findDuplicates(email, nip);
    if (dup) return { fieldErrors: dup, values };

    const user = await User.create({
      username: name,
      email,
      password: await hashPassword(password),
      role: "teacher",
      isActive: true,
    });
    createdUserId = user._id;

    await TeacherProfile.create({
      user: user._id,
      nip,
      specialization: specialization || undefined,
      isActive: true,
    });
  } catch (err) {
    // Rollback: jangan tinggalkan User tanpa TeacherProfile
    if (createdUserId) await User.findByIdAndDelete(createdUserId).catch(() => {});
    const dupErr = duplicateKeyErrors(err, email, nip);
    if (dupErr) return { fieldErrors: dupErr, values };
    return { error: "Gagal menyimpan data guru. Coba lagi.", values };
  }

  revalidatePath("/admin/guru");
  revalidatePath("/admin/penugasan");
  return { success: true };
}

/** `profileId` = _id TeacherProfile (bukan _id User). */
export async function updateGuru(
  profileId: string,
  _prev: GuruFormState,
  formData: FormData,
): Promise<GuruFormState> {
  if (!(await getAdminFromSession())) return { error: NOT_ADMIN };
  if (!objectIdRegex.test(profileId)) return { error: "Guru tidak ditemukan." };

  const raw = readRaw(formData);
  const values = valuesOf(raw);
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, values };
  const { name, email, nip, specialization, password } = parsed.data;

  try {
    await connectDB();

    const profile = await TeacherProfile.findById(profileId);
    if (!profile) return { error: "Guru tidak ditemukan.", values };
    const user = await User.findOne({ _id: profile.user, role: "teacher" });
    if (!user) return { error: "Akun guru tidak ditemukan.", values };

    const dup = await findDuplicates(email, nip, String(user._id));
    if (dup) return { fieldErrors: dup, values };

    user.username = name;
    user.email = email;
    if (password) user.password = await hashPassword(password);
    await user.save();

    profile.nip = nip;
    profile.specialization = specialization || undefined;
    await profile.save();
  } catch (err) {
    const dupErr = duplicateKeyErrors(err, email, nip);
    if (dupErr) return { fieldErrors: dupErr, values };
    return { error: "Gagal memperbarui data guru. Coba lagi.", values };
  }

  revalidatePath("/admin/guru");
  revalidatePath("/admin/penugasan");
  return { success: true };
}

/** Nonaktifkan / aktifkan kembali guru. Data & penugasan tidak dihapus. */
export async function setGuruActive(profileId: string, active: boolean): Promise<GuruActionResult> {
  if (!(await getAdminFromSession())) return { error: NOT_ADMIN };
  if (!objectIdRegex.test(profileId) || typeof active !== "boolean") {
    return { error: "Permintaan tidak valid." };
  }

  try {
    await connectDB();
    const profile = await TeacherProfile.findById(profileId);
    if (!profile) return { error: "Guru tidak ditemukan." };

    const user = await User.findOneAndUpdate(
      { _id: profile.user, role: "teacher" },
      { isActive: active },
    );
    if (!user) return { error: "Akun guru tidak ditemukan." };

    profile.isActive = active;
    await profile.save();
  } catch {
    return { error: "Gagal mengubah status guru." };
  }

  revalidatePath("/admin/guru");
  revalidatePath("/admin/penugasan");
  return { success: true };
}
