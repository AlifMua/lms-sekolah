import { connectDB } from '@/lib/mongodb';
import Major from '@/models/Major';
import { JurusanPageClient } from '@/components/admin/JurusanPageClient';
import type { JurusanItem } from '@/components/admin/dialogs/JurusanDialog';

export default async function JurusanListPage() {
  await connectDB();
  const rawMajors = await Major.find({}).sort({ abbreviation: 1 }).lean<JurusanItem[]>();

  // Serialisasi: lean() mengembalikan ObjectId, harus diubah ke string
  const items: JurusanItem[] = rawMajors.map((m) => ({
    _id: String(m._id),
    name: m.name,
    abbreviation: m.abbreviation,
    description: m.description,
  }));

  return <JurusanPageClient items={items} />;
}
