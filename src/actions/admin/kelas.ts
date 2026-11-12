'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import Class from '@/models/Class';

// ── Schema ────────────────────────────────────────────────────────────────────

const kelasSchema = z.object({
  name: z.string().min(2, 'Nama kelas minimal 2 karakter').trim(),
  grade: z.enum(['X', 'XI', 'XII'], { message: 'Tingkat tidak valid' }),
  major: z.string().min(1, 'Jurusan wajib dipilih'),
  academicYear: z.string().min(1, 'Tahun ajaran wajib dipilih'),
  homeroomTeacher: z.string().optional(),
});

export type KelasFormState = {
  error?: string;
  fieldErrors?: Partial<
    Record<'name' | 'grade' | 'major' | 'academicYear' | 'homeroomTeacher', string[]>
  >;
  success?: boolean;
};

// ── Actions ───────────────────────────────────────────────────────────────────

export async function createKelas(
  _prev: KelasFormState,
  formData: FormData,
): Promise<KelasFormState> {
  const raw = {
    name: formData.get('name'),
    grade: formData.get('grade'),
    major: formData.get('major'),
    academicYear: formData.get('academicYear'),
    homeroomTeacher: formData.get('homeroomTeacher') || undefined,
  };

  const parsed = kelasSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { name, grade, major, academicYear, homeroomTeacher } = parsed.data;

  try {
    await connectDB();
    await Class.create({
      name,
      grade,
      major,
      academicYear,
      ...(homeroomTeacher ? { homeroomTeacher } : {}),
    });
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      return { error: 'Nama kelas sudah ada di tahun ajaran ini.' };
    }
    return { error: 'Gagal menyimpan data. Coba lagi.' };
  }

  revalidatePath('/admin/kelas');
  revalidatePath('/admin/jurusan');
  return { success: true };
}

export async function updateKelas(
  id: string,
  _prev: KelasFormState,
  formData: FormData,
): Promise<KelasFormState> {
  const raw = {
    name: formData.get('name'),
    grade: formData.get('grade'),
    major: formData.get('major'),
    academicYear: formData.get('academicYear'),
    homeroomTeacher: formData.get('homeroomTeacher') || undefined,
  };

  const parsed = kelasSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { name, grade, major, academicYear, homeroomTeacher } = parsed.data;

  try {
    await connectDB();
    const updated = await Class.findByIdAndUpdate(
      id,
      {
        name,
        grade,
        major,
        academicYear,
        homeroomTeacher: homeroomTeacher ?? null,
      },
      { new: true },
    );
    if (!updated) return { error: 'Kelas tidak ditemukan.' };
  } catch {
    return { error: 'Gagal memperbarui data. Coba lagi.' };
  }

  revalidatePath('/admin/kelas');
  revalidatePath('/admin/jurusan');
  return { success: true };
}

export async function deleteKelas(id: string): Promise<{ error?: string; success?: boolean }> {
  try {
    await connectDB();
    const deleted = await Class.findByIdAndDelete(id);
    if (!deleted) return { error: 'Kelas tidak ditemukan.' };
  } catch {
    return { error: 'Gagal menghapus data.' };
  }

  revalidatePath('/admin/kelas');
  revalidatePath('/admin/jurusan');
  return { success: true };
}
