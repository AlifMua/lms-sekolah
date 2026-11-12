import { connectDB } from '@/lib/mongodb';
import AcademicYear from '@/models/AcademicYear';
import { TahunAjaranPageClient } from '@/components/admin/TahunAjaranPageClient';
import type { TahunAjaranItem } from '@/components/admin/dialogs/TahunAjaranDialog';

export default async function TahunAjaranPage() {
  await connectDB();
  const raw = await AcademicYear.find({})
    .sort({ year: -1, semester: 1 })
    .lean<Array<{
      _id: unknown;
      year: string;
      semester: 'ganjil' | 'genap';
      isActive: boolean;
      startDate: Date;
      endDate: Date;
    }>>();

  const items: TahunAjaranItem[] = raw.map((r) => ({
    _id: String(r._id),
    year: r.year,
    semester: r.semester,
    isActive: r.isActive,
    startDate: r.startDate.toISOString(),
    endDate: r.endDate.toISOString(),
  }));

  return <TahunAjaranPageClient items={items} />;
}
