'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import TeachingAssignment from '@/models/TeachingAssignment';
import Class from '@/models/Class';

// ── Types ─────────────────────────────────────────────────────────────────────

export type PenugasanFormState = {
  error?: string;
  fieldErrors?: Partial<Record<'teacher' | 'subject' | 'class' | 'academicYear', string[]>>;
  success?: boolean;
};

export type WaliKelasFormState = {
  error?: string;
  success?: boolean;
};

// ── Schemas ───────────────────────────────────────────────────────────────────

const objectIdRegex = /^[a-f\d]{24}$/i;
const objectId = z.string().regex(objectIdRegex, 'ID tidak valid');

const penugasanSchema = z.object({
  teacher: objectId,
  subject: objectId,
  class: objectId,
  academicYear: objectId,
});

// ── TeachingAssignment Actions ────────────────────────────────────────────────

export async function createPenugasan(
  _prev: PenugasanFormState,
  formData: FormData,
): Promise<PenugasanFormState> {
  const raw = {
    teacher: formData.get('teacher'),
    subject: formData.get('subject'),
    class: formData.get('class'),
    academicYear: formData.get('academicYear'),
  };

  const parsed = penugasanSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await connectDB();
    await TeachingAssignment.create(parsed.data);
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      return { error: 'Penugasan ini sudah ada (guru, mapel, kelas, dan tahun ajaran sama).' };
    }
    return { error: 'Gagal menyimpan penugasan. Coba lagi.' };
  }

  revalidatePath('/admin/penugasan');
  return { success: true };
}

export async function deletePenugasan(id: string): Promise<{ error?: string; success?: boolean }> {
  try {
    await connectDB();
    const deleted = await TeachingAssignment.findByIdAndDelete(id);
    if (!deleted) return { error: 'Penugasan tidak ditemukan.' };
  } catch {
    return { error: 'Gagal menghapus penugasan.' };
  }

  revalidatePath('/admin/penugasan');
  return { success: true };
}

// ── Wali Kelas Action ─────────────────────────────────────────────────────────

export async function assignWaliKelas(
  classId: string,
  _prev: WaliKelasFormState,
  formData: FormData,
): Promise<WaliKelasFormState> {
  const teacherId = formData.get('homeroomTeacher');

  // Boleh kosong string (untuk remove wali kelas)
  if (teacherId && typeof teacherId === 'string' && !objectIdRegex.test(teacherId)) {
    return { error: 'Guru tidak valid.' };
  }

  try {
    await connectDB();

    // Ambil data kelas saat ini (butuh academicYear untuk validasi uniqueness)
    const targetClass = await Class.findById(classId).lean<{
      _id: unknown;
      name: string;
      academicYear: unknown;
    }>();
    if (!targetClass) return { error: 'Kelas tidak ditemukan.' };

    // Validasi: satu guru hanya boleh jadi wali kelas 1 kelas per tahun ajaran
    if (teacherId && typeof teacherId === 'string' && teacherId !== '') {
      const conflict = await Class.findOne({
        homeroomTeacher: teacherId,
        academicYear: targetClass.academicYear,
        _id: { $ne: classId }, // kecualikan kelas ini sendiri
      }).lean<{ name: string }>();

      if (conflict) {
        return {
          error: `Guru ini sudah menjadi wali kelas "${conflict.name}" pada tahun ajaran yang sama. Satu guru hanya boleh menjadi wali kelas 1 kelas per tahun ajaran.`,
        };
      }
    }

    await Class.findByIdAndUpdate(
      classId,
      { homeroomTeacher: teacherId || undefined },
      { new: true },
    );
  } catch {
    return { error: 'Gagal mengubah wali kelas.' };
  }

  revalidatePath('/admin/kelas');
  revalidatePath('/admin/penugasan');
  return { success: true };
}
