import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/**
 * Hash password plain-text menjadi bcrypt hash.
 * Dipakai saat mendaftarkan user baru (admin seed, import siswa, dsb.).
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Verifikasi password plain-text terhadap bcrypt hash yang tersimpan di DB.
 * Kembalikan true jika cocok, false jika tidak.
 *
 * Catatan: fungsi ini sudah dipanggil di dalam authOptions (auth.ts),
 * tapi diekspos di sini agar bisa dipakai di tempat lain bila perlu
 * (misalnya fitur "ganti password").
 */
export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}
