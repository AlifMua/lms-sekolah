"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/mongodb";
import { hashPassword } from "@/lib/password";
import User from "@/models/User";
import StudentProfile from "@/models/StudentProfile";
import Class from "@/models/Class";
import Major from "@/models/Major";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Satu baris parsed dari Excel sebelum divalidasi ke DB */
export type ParsedRow = {
  rowNum: number; // nomor baris di Excel (mulai dari 2)
  nis: string;
  nama: string;
  email: string;
  kelasNama: string; // nama kelas (exact match)
  jurusanAbbr: string; // singkatan jurusan (exact match)
  tahunMasuk: number;
  passwordAwal: string;
};

/** Satu baris setelah validasi: valid atau error */
export type ValidatedRow =
  | {
      status: "valid";
      rowNum: number;
      nis: string;
      nama: string;
      email: string;
      kelasNama: string;
      jurusanAbbr: string;
      tahunMasuk: number;
      passwordAwal: string;
      kelasId: string;
      majorId: string;
    }
  | {
      status: "error";
      rowNum: number;
      nis: string;
      nama: string;
      email: string;
      kelasNama: string;
      jurusanAbbr: string;
      tahunMasuk: number;
      passwordAwal: string;
      errors: string[];
    };

export type ImportResult = {
  imported: number;
  skipped: number;
  errors: Array<{ rowNum: number; nis: string; nama: string; error: string }>;
};

// ── Action 1: Validasi baris terhadap database ────────────────────────────────
// Dipanggil dari client setelah parse Excel di browser.
// Mengembalikan array ValidatedRow (per-baris, bukan all-or-nothing).

export async function validateImportRows(
  rows: ParsedRow[],
): Promise<ValidatedRow[]> {
  await connectDB();

  // Load semua kelas & jurusan sekali saja (lookup table)
  const [allClasses, allMajors] = await Promise.all([
    Class.find({})
      .select("_id name")
      .lean<Array<{ _id: unknown; name: string }>>(),
    Major.find({})
      .select("_id abbreviation")
      .lean<Array<{ _id: unknown; abbreviation: string }>>(),
  ]);

  const classMap = new Map<string, string>(); // namaKelas → _id
  for (const c of allClasses) classMap.set(c.name, String(c._id));

  const majorMap = new Map<string, string>(); // abbr.toUpperCase() → _id
  for (const m of allMajors) majorMap.set(m.abbreviation.toUpperCase(), String(m._id));

  // Cek NIS dan email yang sudah ada di DB
  const nisValues = rows.map((r) => r.nis).filter(Boolean);
  const emailValues = rows.map((r) => r.email.toLowerCase()).filter(Boolean);

  const [existingProfiles, existingUsers] = await Promise.all([
    StudentProfile.find({ nis: { $in: nisValues } })
      .select("nis")
      .lean<Array<{ nis: string }>>(),
    User.find({ email: { $in: emailValues } })
      .select("email")
      .lean<Array<{ email: string }>>(),
  ]);

  const existingNIS = new Set(existingProfiles.map((p) => p.nis));
  const existingEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));

  // Cek duplikat dalam batch Excel itu sendiri (baris-ke-baris)
  const batchNIS = new Map<string, number>(); // nis → rowNum pertama kemunculan
  const batchEmails = new Map<string, number>();

  const results: ValidatedRow[] = rows.map((row) => {
    const errors: string[] = [];

    if (!row.nis) errors.push("NIS wajib diisi.");
    if (!row.nama) errors.push("Nama wajib diisi.");
    if (!row.email) errors.push("Email wajib diisi.");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email))
      errors.push("Format email tidak valid.");
    if (!row.kelasNama) errors.push("Nama Kelas wajib diisi.");
    if (!row.jurusanAbbr) errors.push("Singkatan Jurusan wajib diisi.");
    if (!row.tahunMasuk || row.tahunMasuk < 2000)
      errors.push("Tahun Masuk tidak valid (min. 2000).");
    if (!row.passwordAwal) errors.push("Password Awal wajib diisi.");
    else if (row.passwordAwal.length < 6)
      errors.push("Password Awal minimal 6 karakter.");

    // Cek exact match kelas
    const kelasId = classMap.get(row.kelasNama);
    if (row.kelasNama && !kelasId)
      errors.push(
        `Kelas "${row.kelasNama}" tidak ditemukan di database. Gunakan nama kelas yang persis sama.`,
      );

    // Cek exact match jurusan
    const majorId = row.jurusanAbbr
      ? majorMap.get(row.jurusanAbbr.toUpperCase())
      : undefined;
    if (row.jurusanAbbr && !majorId)
      errors.push(
        `Jurusan "${row.jurusanAbbr}" tidak ditemukan. Gunakan singkatan yang persis sama (mis. PPLG, TJKT, DKV).`,
      );

    // Cek duplikat NIS di DB
    if (row.nis && existingNIS.has(row.nis))
      errors.push(`NIS "${row.nis}" sudah terdaftar di database.`);

    // Cek duplikat NIS dalam batch
    if (row.nis) {
      if (batchNIS.has(row.nis)) {
        errors.push(
          `NIS "${row.nis}" duplikat dalam file ini (pertama di baris ${batchNIS.get(row.nis)}).`,
        );
      } else {
        batchNIS.set(row.nis, row.rowNum);
      }
    }

    // Cek duplikat email di DB
    const emailLower = row.email?.toLowerCase() ?? "";
    if (emailLower && existingEmails.has(emailLower))
      errors.push(`Email "${row.email}" sudah terdaftar di database.`);

    // Cek duplikat email dalam batch
    if (emailLower) {
      if (batchEmails.has(emailLower)) {
        errors.push(
          `Email "${row.email}" duplikat dalam file ini (pertama di baris ${batchEmails.get(emailLower)}).`,
        );
      } else {
        batchEmails.set(emailLower, row.rowNum);
      }
    }

    if (errors.length > 0) {
      return { status: "error", ...row, errors };
    }

    return {
      status: "valid",
      ...row,
      kelasId: kelasId!,
      majorId: majorId!,
    };
  });

  return results;
}

// ── Action 2: Commit import (hanya baris valid) ───────────────────────────────

export async function commitImportSiswa(
  validRows: Array<{
    rowNum: number;
    nis: string;
    nama: string;
    email: string;
    kelasId: string;
    majorId: string;
    tahunMasuk: number;
    passwordAwal: string;
  }>,
): Promise<ImportResult> {
  await connectDB();

  const result: ImportResult = {
    imported: 0,
    skipped: 0,
    errors: [],
  };

  for (const row of validRows) {
    try {
      // Double-check: NIS / email belum ada (race condition guard)
      const [dupNIS, dupEmail] = await Promise.all([
        StudentProfile.exists({ nis: row.nis }),
        User.exists({ email: row.email.toLowerCase() }),
      ]);

      if (dupNIS) {
        result.errors.push({
          rowNum: row.rowNum,
          nis: row.nis,
          nama: row.nama,
          error: `NIS "${row.nis}" sudah terdaftar (race condition).`,
        });
        result.skipped++;
        continue;
      }
      if (dupEmail) {
        result.errors.push({
          rowNum: row.rowNum,
          nis: row.nis,
          nama: row.nama,
          error: `Email "${row.email}" sudah terdaftar (race condition).`,
        });
        result.skipped++;
        continue;
      }

      // Buat User + StudentProfile
      const hashedPw = await hashPassword(row.passwordAwal);
      const user = await User.create({
        username: row.nama,
        email: row.email.toLowerCase(),
        password: hashedPw,
        role: "student",
      });

      await StudentProfile.create({
        user: user._id,
        nis: row.nis,
        class: row.kelasId,
        major: row.majorId,
        enrollmentYear: row.tahunMasuk,
        isActive: true,
      });

      result.imported++;
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error tidak diketahui.";
      result.errors.push({
        rowNum: row.rowNum,
        nis: row.nis,
        nama: row.nama,
        error: msg,
      });
      result.skipped++;
    }
  }

  revalidatePath("/admin/siswa");
  return result;
}

// ── Action 3: Hapus siswa ─────────────────────────────────────────────────────

export async function deleteSiswa(
  profileId: string,
): Promise<{ error?: string; success?: boolean }> {
  try {
    await connectDB();
    const profile = await StudentProfile.findById(profileId);
    if (!profile) return { error: "Siswa tidak ditemukan." };

    // Hapus StudentProfile + User terkait
    await Promise.all([
      StudentProfile.findByIdAndDelete(profileId),
      User.findByIdAndDelete(profile.user),
    ]);
  } catch {
    return { error: "Gagal menghapus data siswa." };
  }

  revalidatePath("/admin/siswa");
  return { success: true };
}


