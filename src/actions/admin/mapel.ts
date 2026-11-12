'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import Subject from '@/models/Subject';

// ── Schema ────────────────────────────────────────────────────────────────────

const mapelSchema = z.object({
  name: z.string().min(2, 'Nama mata pelajaran minimal 2 karakter').trim(),
  code: z.string().min(2, 'Kode minimal 2 karakter').trim(),
  category: z.enum(['umum', 'kejuruan', 'muatan-lokal'], {
    message: 'Kategori tidak valid',
  }),
});

export type MapelFormState = {
  error?: string;
  fieldErrors?: Partial<Record<'name' | 'code' | 'category', string[]>>;
  success?: boolean;
};

// ── Actions ───────────────────────────────────────────────────────────────────

export async function createMapel(
  _prev: MapelFormState,
  formData: FormData,
): Promise<MapelFormState> {
  const raw = {
    name: formData.get('name'),
    code: formData.get('code'),
    category: formData.get('category'),
  };

  const parsed = mapelSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { name, code, category } = parsed.data;

  try {
    await connectDB();
    await Subject.create({ name, code: code.toUpperCase(), category });
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      return { error: 'Kode mata pelajaran sudah digunakan.' };
    }
    return { error: 'Gagal menyimpan data. Coba lagi.' };
  }

  revalidatePath('/admin/mapel');
  return { success: true };
}

export async function updateMapel(
  id: string,
  _prev: MapelFormState,
  formData: FormData,
): Promise<MapelFormState> {
  const raw = {
    name: formData.get('name'),
    code: formData.get('code'),
    category: formData.get('category'),
  };

  const parsed = mapelSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { name, code, category } = parsed.data;

  try {
    await connectDB();
    const updated = await Subject.findByIdAndUpdate(
      id,
      { name, code: code.toUpperCase(), category },
      { new: true },
    );
    if (!updated) return { error: 'Mata pelajaran tidak ditemukan.' };
  } catch {
    return { error: 'Gagal memperbarui data. Coba lagi.' };
  }

  revalidatePath('/admin/mapel');
  return { success: true };
}

export async function deleteMapel(id: string): Promise<{ error?: string; success?: boolean }> {
  try {
    await connectDB();
    const deleted = await Subject.findByIdAndDelete(id);
    if (!deleted) return { error: 'Mata pelajaran tidak ditemukan.' };
  } catch {
    return { error: 'Gagal menghapus data.' };
  }

  revalidatePath('/admin/mapel');
  return { success: true };
}
