import { connectDB } from "@/lib/mongodb";
import AcademicYear from "@/models/AcademicYear";
import Class from "@/models/Class";
import Major from "@/models/Major";
import StudentProfile from "@/models/StudentProfile";
import User from "@/models/User";
import type { AdminStats, Jurusan, Kelas } from "@/types/admin";

/** Statistik dashboard admin dari MongoDB. Hanya akun aktif yang dihitung. */
export async function getAdminStats(): Promise<AdminStats> {
  await connectDB();

  const [totalSiswa, totalGuru, totalKelas, totalJurusan, activeYear] = await Promise.all([
    StudentProfile.countDocuments({ isActive: { $ne: false } }),
    User.countDocuments({ role: "teacher", isActive: { $ne: false } }),
    Class.countDocuments({}),
    Major.countDocuments({}),
    AcademicYear.findOne({ isActive: true }).lean<{ year: string; semester: string }>(),
  ]);

  return {
    totalSiswa,
    totalGuru,
    totalKelas,
    totalJurusan,
    tahunAjaranAktif: activeYear ? `${activeYear.year} (${activeYear.semester})` : "Belum ada tahun ajaran aktif",
  };
}

type MajorDoc = { _id: unknown; name: string; abbreviation: string; slug: string };

function toJurusan(m: MajorDoc): Jurusan {
  return { id: String(m._id), nama: m.name, slug: m.slug, singkatan: m.abbreviation };
}

export async function listJurusan(): Promise<Jurusan[]> {
  await connectDB();
  const majors = await Major.find({}).sort({ abbreviation: 1 }).lean<MajorDoc[]>();
  return majors.map(toJurusan);
}

/**
 * Detail jurusan + daftar kelasnya (beserta jumlah siswa aktif & wali kelas).
 * Mengembalikan null jika slug tidak ditemukan.
 */
export async function getJurusanDetail(
  slug: string,
): Promise<{ jurusan: Jurusan; kelas: Kelas[] } | null> {
  await connectDB();
  void User; // pastikan model terdaftar untuk populate

  const major = await Major.findOne({ slug: slug.toLowerCase() }).lean<MajorDoc>();
  if (!major) return null;

  const classes = await Class.find({ major: major._id })
    .populate("homeroomTeacher", "username")
    .sort({ grade: 1, name: 1 })
    .lean<
      Array<{
        _id: unknown;
        name: string;
        grade: "X" | "XI" | "XII";
        homeroomTeacher?: { username: string } | null;
      }>
    >();

  const counts = await StudentProfile.aggregate<{ _id: unknown; n: number }>([
    { $match: { class: { $in: classes.map((c) => c._id) }, isActive: { $ne: false } } },
    { $group: { _id: "$class", n: { $sum: 1 } } },
  ]);
  const countByClass = new Map(counts.map((c) => [String(c._id), c.n]));

  const jurusan = toJurusan(major);
  const order = { X: 0, XI: 1, XII: 2 } as const;

  return {
    jurusan,
    kelas: classes
      .map((c) => ({
        id: String(c._id),
        nama: c.name,
        jurusanId: jurusan.id,
        jurusanSlug: jurusan.slug,
        tingkat: c.grade,
        jumlahSiswa: countByClass.get(String(c._id)) ?? 0,
        waliKelas: c.homeroomTeacher?.username ?? "Belum ditentukan",
      }))
      .sort((a, b) => order[a.tingkat] - order[b.tingkat] || a.nama.localeCompare(b.nama)),
  };
}
