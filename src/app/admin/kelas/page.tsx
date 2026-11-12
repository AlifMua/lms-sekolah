import { connectDB } from '@/lib/mongodb';
import Class from '@/models/Class';
import Major from '@/models/Major';
import AcademicYear from '@/models/AcademicYear';
import { KelasPageClient, type KelasRow } from '@/components/admin/KelasPageClient';
import type { JurusanItem } from '@/components/admin/dialogs/JurusanDialog';
import type { TahunAjaranItem } from '@/components/admin/dialogs/TahunAjaranDialog';

export default async function KelasPage() {
  await connectDB();

  // Fetch semua data paralel
  const [rawClasses, rawMajors, rawAcademicYears] = await Promise.all([
    Class.find({}).populate('major').populate('academicYear').lean<Array<{
      _id: unknown;
      name: string;
      grade: 'X' | 'XI' | 'XII';
      major: { _id: unknown; name: string; abbreviation: string } | null;
      academicYear: { _id: unknown; year: string; semester: string; isActive: boolean } | null;
      homeroomTeacher?: unknown;
    }>>(),
    Major.find({}).sort({ abbreviation: 1 }).lean<Array<{ _id: unknown; name: string; abbreviation: string; description?: string }>>(),
    AcademicYear.find({}).sort({ year: -1 }).lean<Array<{ _id: unknown; year: string; semester: string; isActive: boolean; startDate: Date; endDate: Date }>>(),
  ]);

  const jurusanList: JurusanItem[] = rawMajors.map((m) => ({
    _id: String(m._id),
    name: m.name,
    abbreviation: m.abbreviation,
    description: m.description,
  }));

  const tahunAjaranList: TahunAjaranItem[] = rawAcademicYears.map((t) => ({
    _id: String(t._id),
    year: t.year,
    semester: t.semester as 'ganjil' | 'genap',
    isActive: t.isActive,
    startDate: t.startDate.toISOString(),
    endDate: t.endDate.toISOString(),
  }));

  const items: KelasRow[] = rawClasses.map((c) => ({
    _id: String(c._id),
    name: c.name,
    grade: c.grade,
    major: c.major ? String(c.major._id) : '',
    academicYear: c.academicYear ? String(c.academicYear._id) : '',
    majorName: c.major?.name ?? '-',
    majorAbbr: c.major?.abbreviation ?? '-',
    academicYearLabel: c.academicYear
      ? `${c.academicYear.year} – ${c.academicYear.semester}`
      : '-',
  }));

  return (
    <KelasPageClient
      items={items}
      jurusanList={jurusanList}
      tahunAjaranList={tahunAjaranList}
    />
  );
}
