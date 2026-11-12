'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import Major from '@/models/Major';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// ── Schema ────────────────────────────────────────────────────────────────────

const jurusanSchema = z.object({
  name: z.string().min(3, 'Nama jurusan minimal 3 karakter').trim(),
  abbreviation: z.string().min(2, 'Singkatan minimal 2 karakter').trim(),
  description: z.string().optional(),
});

export type JurusanFormState = {
  error?: string;
  fieldErrors?: Partial<Record<'name' | 'abbreviation' | 'description', string[]>>;
  success?: boolean;
};

// ── Actions ───────────────────────────────────────────────────────────────────

export async function createJurusan(
  _prev: JurusanFormState,
  formData: FormData,
): Promise<JurusanFormState> {
  const raw = {
    name: formData.get('name'),
    abbreviation: formData.get('abbreviation'),
    description: formData.get('description') || undefined,
  };

  const parsed = jurusanSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { name, abbreviation, description } = parsed.data;
  const slug = makeSlug(abbreviation);

  try {
    await connectDB();
    await Major.create({ name, abbreviation: abbreviation.toUpperCase(), slug, description });
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      return { error: 'Jurusan dengan singkatan tersebut sudah ada.' };
    }
    return { error: 'Gagal menyimpan data. Coba lagi.' };
  }

  revalidatePath('/admin/jurusan');
  revalidatePath('/admin');
  return { success: true };
}

export async function updateJurusan(
  id: string,
  _prev: JurusanFormState,
  formData: FormData,
): Promise<JurusanFormState> {
  const raw = {
    name: formData.get('name'),
    abbreviation: formData.get('abbreviation'),
    description: formData.get('description') || undefined,
  };

  const parsed = jurusanSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { name, abbreviation, description } = parsed.data;
  const slug = makeSlug(abbreviation);

  try {
    await connectDB();
    const updated = await Major.findByIdAndUpdate(
      id,
      { name, abbreviation: abbreviation.toUpperCase(), slug, description },
      { new: true },
    );
    if (!updated) return { error: 'Jurusan tidak ditemukan.' };
  } catch {
    return { error: 'Gagal memperbarui data. Coba lagi.' };
  }

  revalidatePath('/admin/jurusan');
  revalidatePath('/admin');
  return { success: true };
}

export async function deleteJurusan(id: string): Promise<{ error?: string; success?: boolean }> {
  try {
    await connectDB();
    const deleted = await Major.findByIdAndDelete(id);
    if (!deleted) return { error: 'Jurusan tidak ditemukan.' };
  } catch {
    return { error: 'Gagal menghapus data.' };
  }

  revalidatePath('/admin/jurusan');
  revalidatePath('/admin');
  return { success: true };
}
