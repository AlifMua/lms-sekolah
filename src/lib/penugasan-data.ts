import { connectDB } from "@/lib/mongodb";
import TeachingAssignment from "@/models/TeachingAssignment";
import Class from "@/models/Class";
import Subject from "@/models/Subject";
import AcademicYear from "@/models/AcademicYear";
import User from "@/models/User";
import TeacherProfile from "@/models/TeacherProfile";
import type { PenugasanRow, KelasWaliRow } from "@/components/admin/PenugasanPageClient";
import type {
  GuruOption,
  MapelOption,
  KelasOption,
  TahunAjaranOption,
} from "@/components/admin/dialogs/PenugasanDialog";

export type PenugasanPageData = {
  /** SEMUA penugasan (termasuk guru nonaktif), lengkap dengan NIP. */
  penugasanList: PenugasanRow[];
  kelasWaliList: KelasWaliRow[];
  /** Pilihan guru di dialog: HANYA guru aktif. */
  guruList: GuruOption[];
  mapelList: MapelOption[];
  kelasList: KelasOption[];
  tahunAjaranList: TahunAjaranOption[];
};

/**
 * Data untuk /admin/penugasan.
 *
 * Aturan:
 * - Tabel penugasan & tabel wali kelas menampilkan SEMUA data lengkap dengan NIP,
 *   termasuk guru nonaktif (riwayat penugasan tidak boleh "kehilangan" NIP).
 * - Hanya dropdown pilihan guru (dialog tambah penugasan / wali kelas) yang
 *   menyaring guru nonaktif, supaya guru nonaktif tidak bisa ditugaskan baru.
 */
export async function getPenugasanPageData(): Promise<PenugasanPageData> {
  await connectDB();

  const [rawAssignments, rawClasses, rawSubjects, rawAcademicYears, rawTeachers, rawProfiles] =
    await Promise.all([
      TeachingAssignment.find({})
        .populate("teacher", "username")
        .populate("subject", "name code")
        .populate("class", "name")
        .populate("academicYear", "year semester")
        .lean<
          Array<{
            _id: unknown;
            teacher: { _id: unknown; username: string } | null;
            subject: { _id: unknown; name: string; code: string } | null;
            class: { _id: unknown; name: string } | null;
            academicYear: { _id: unknown; year: string; semester: string } | null;
          }>
        >(),

      Class.find({})
        .populate("homeroomTeacher", "username")
        .lean<
          Array<{
            _id: unknown;
            name: string;
            homeroomTeacher: { _id: unknown; username: string } | null;
          }>
        >(),

      Subject.find({}).sort({ code: 1 }).lean<Array<{ _id: unknown; name: string; code: string }>>(),

      AcademicYear.find({})
        .sort({ year: -1 })
        .lean<Array<{ _id: unknown; year: string; semester: string; isActive: boolean }>>(),

      // Semua guru (aktif & nonaktif); penyaringan aktif dilakukan hanya untuk dropdown di bawah
      User.find({ role: "teacher" }).lean<Array<{ _id: unknown; username: string; isActive?: boolean }>>(),

      // NIP SEMUA guru, tidak peduli status aktif
      TeacherProfile.find({}).lean<Array<{ _id: unknown; user: unknown; nip: string }>>(),
    ]);

  const nipByUserId = new Map(rawProfiles.map((p) => [String(p.user), p.nip]));

  const guruList: GuruOption[] = rawTeachers
    .filter((t) => t.isActive !== false)
    .map((t) => ({
      _id: String(t._id),
      username: t.username,
      nip: nipByUserId.get(String(t._id)) ?? "-",
    }));

  const mapelList: MapelOption[] = rawSubjects.map((s) => ({
    _id: String(s._id),
    name: s.name,
    code: s.code,
  }));

  const kelasList: KelasOption[] = rawClasses.map((c) => ({
    _id: String(c._id),
    name: c.name,
  }));

  const tahunAjaranList: TahunAjaranOption[] = rawAcademicYears.map((t) => ({
    _id: String(t._id),
    year: t.year,
    semester: t.semester as "ganjil" | "genap",
    isActive: t.isActive,
  }));

  const penugasanList: PenugasanRow[] = rawAssignments
    .filter((a) => a.teacher && a.subject && a.class && a.academicYear)
    .map((a) => ({
      _id: String(a._id),
      teacherName: a.teacher!.username,
      teacherNip: nipByUserId.get(String(a.teacher!._id)) ?? "-",
      subjectName: a.subject!.name,
      subjectCode: a.subject!.code,
      className: a.class!.name,
      academicYearLabel: `${a.academicYear!.year} – ${a.academicYear!.semester}`,
    }));

  const kelasWaliList: KelasWaliRow[] = rawClasses.map((c) => ({
    _id: String(c._id),
    name: c.name,
    homeroomTeacherId: c.homeroomTeacher ? String(c.homeroomTeacher._id) : undefined,
    homeroomTeacherName: c.homeroomTeacher?.username,
    homeroomTeacherNip: c.homeroomTeacher
      ? nipByUserId.get(String(c.homeroomTeacher._id))
      : undefined,
  }));

  return { penugasanList, kelasWaliList, guruList, mapelList, kelasList, tahunAjaranList };
}
