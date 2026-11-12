import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import StudentProfile from "@/models/StudentProfile";
import Class from "@/models/Class";
import Major from "@/models/Major";
import { SiswaPageClient, type SiswaRow } from "@/components/admin/SiswaPageClient";

type StudentProfileLean = {
  _id: unknown;
  nis: string;
  enrollmentYear: number;
  user: { _id: unknown; username: string; email: string } | null;
  class: { _id: unknown; name: string } | null;
  major: { _id: unknown; name: string; abbreviation: string } | null;
};

export default async function SiswaPage() {
  await connectDB();

  // Pastikan model terdaftar agar populate bisa jalan
  void Class;
  void Major;

  const rawProfiles = await StudentProfile.find({ isActive: true })
    .populate({
      path: "user",
      model: User,
      select: "username email",
    })
    .populate({
      path: "class",
      model: Class,
      select: "name",
    })
    .populate({
      path: "major",
      model: Major,
      select: "name abbreviation",
    })
    .sort({ createdAt: -1 })
    .lean<StudentProfileLean[]>();

  const items: SiswaRow[] = rawProfiles.map((p) => ({
    _id: String(p._id),
    nis: p.nis,
    nama: p.user?.username ?? "-",
    email: p.user?.email ?? "-",
    kelas: p.class?.name ?? "-",
    jurusan: p.major?.abbreviation ?? "-",
    enrollmentYear: p.enrollmentYear,
  }));

  return <SiswaPageClient items={items} totalCount={items.length} />;
}
