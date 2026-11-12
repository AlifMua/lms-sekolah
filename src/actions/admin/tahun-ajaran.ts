'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import AcademicYear from '@/models/AcademicYear';

// ── Schema ────────────────────────────────────────────────────────────────────

const tahunAjaranSchema = z.object({
  year: z
    .string()
    .regex(/^\d{4}\/\d{4}$/, 'Format tahun harus YYYY/YYYY, contoh: 2025/2026')
    .trim(),
  semester: z.enum(['ganjil', 'genap'], { message: 'Semester harus ganjil atau genap' }),
  startDate: z.string().min(1, 'Tanggal mulai wajib diisi'),
  endDate: z.string().min(1, 'Tanggal selesai wajib diisi'),
});

export type TahunAjaranFormState = {
  error?: string;
  fieldErrors?: Partial<
    Record<'year' | 'semester' | 'startDate' | 'endDate', string[]>
  >;
  success?: boolean;
};

// ── Actions ───────────────────────────────────────────────────────────────────

export async function createTahunAjaran(
  _prev: TahunAjaranFormState,
  formData: FormData,
): Promise<TahunAjaranFormState> {
  const raw = {
    year: formData.get('year'),
    semester: formData.get('semester'),
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate'),
  };

  const parsed = tahunAjaranSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { year, semester, startDate, endDate } = parsed.data;

  try {
    await connectDB();
    await AcademicYear.create({
      year,
      semester,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: false,
    });
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      return { error: `Tahun ajaran ${year} semester ${semester} sudah ada.` };
    }
    return { error: 'Gagal menyimpan data. Coba lagi.' };
  }

  revalidatePath('/admin/tahun-ajaran');
  return { success: true };
}

export async function updateTahunAjaran(
  id: string,
  _prev: TahunAjaranFormState,
  formData: FormData,
): Promise<TahunAjaranFormState> {
  const raw = {
    year: formData.get('year'),
    semester: formData.get('semester'),
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate'),
  };

  const parsed = tahunAjaranSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { year, semester, startDate, endDate } = parsed.data;

  try {
    await connectDB();
    const updated = await AcademicYear.findByIdAndUpdate(
      id,
      { year, semester, startDate: new Date(startDate), endDate: new Date(endDate) },
      { new: true },
    );
    if (!updated) return { error: 'Tahun ajaran tidak ditemukan.' };
  } catch {
    return { error: 'Gagal memperbarui data. Coba lagi.' };
  }

  revalidatePath('/admin/tahun-ajaran');
  return { success: true };
}

/**
 * Mengaktifkan satu tahun ajaran, menonaktifkan semua yang lain.
 * Satu transaksi: updateMany → findByIdAndUpdate.
 */
export async function activateTahunAjaran(
  id: string,
): Promise<{ error?: string; success?: boolean }> {
  try {
    await connectDB();
    // Nonaktifkan semua dulu
    await AcademicYear.updateMany({}, { isActive: false });
    // Aktifkan yang dipilih
    const activated = await AcademicYear.findByIdAndUpdate(
      id,
      { isActive: true },
      { new: true },
    );
    if (!activated) return { error: 'Tahun ajaran tidak ditemukan.' };
  } catch {
    return { error: 'Gagal mengaktifkan tahun ajaran.' };
  }

  revalidatePath('/admin/tahun-ajaran');
  revalidatePath('/admin');
  return { success: true };
}

export async function deleteTahunAjaran(
  id: string,
): Promise<{ error?: string; success?: boolean }> {
  try {
    await connectDB();
    const record = await AcademicYear.findById(id);
    if (!record) return { error: 'Tahun ajaran tidak ditemukan.' };
    if (record.isActive) return { error: 'Tidak bisa menghapus tahun ajaran yang sedang aktif.' };
    await AcademicYear.findByIdAndDelete(id);
  } catch {
    return { error: 'Gagal menghapus data.' };
  }

  revalidatePath('/admin/tahun-ajaran');
  return { success: true };
}
