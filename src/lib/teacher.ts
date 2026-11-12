import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import AcademicYear from "@/models/AcademicYear";
import User from "@/models/User";
import TeachingAssignment from "@/models/TeachingAssignment";
// Diimpor agar model terdaftar sebelum populate() dipanggil
import Subject from "@/models/Subject";
import Class from "@/models/Class";

// ── Types ─────────────────────────────────────────────────────────────────────

export type TeacherSession = {
  id: string;
  name: string;
  email: string;
};

export type ActiveAcademicYear = {
  id: string;
  year: string;
  semester: "ganjil" | "genap";
};

/** Satu baris penugasan mengajar milik guru (sudah di-serialize ke plain object). */
export type TeacherAssignmentItem = {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  classId: string;
  className: string;
  grade: "X" | "XI" | "XII";
};

export type TeacherScope = {
  academicYear: ActiveAcademicYear | null;
  assignments: TeacherAssignmentItem[];
};

// ── Session ───────────────────────────────────────────────────────────────────

/**
 * JWT tetap valid sampai kedaluwarsa walau admin menonaktifkan/menghapus akun,
 * jadi status akun dicek ulang ke DB. true = akun ada dan tidak dinonaktifkan.
 */
async function isAccountActive(userId: string): Promise<boolean> {
  await connectDB();
  const user = await User.findById(userId).select("isActive").lean<{ isActive?: boolean }>();
  return !!user && user.isActive !== false;
}

/**
 * Ambil guru yang sedang login dari session (server-side).
 * - Belum login → redirect ke /login
 * - Login tapi bukan role teacher → redirect ke halaman utama
 *
 * Identitas guru SELALU diambil dari session, tidak pernah dari input client,
 * supaya guru tidak bisa memalsukan teacherId.
 */
export async function requireTeacher(): Promise<TeacherSession> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }
  if (session.user.role !== "teacher") {
    redirect("/");
  }
  // Akun dinonaktifkan: arahkan ke /logout (bukan /login, karena proxy akan
  // melempar user yang masih punya sesi kembali ke dashboard → loop).
  if (!(await isAccountActive(session.user.id))) {
    redirect("/logout");
  }

  return {
    id: session.user.id,
    name: session.user.name ?? session.user.email ?? "Guru",
    email: session.user.email ?? "",
  };
}

/**
 * Versi non-redirect dari requireTeacher() untuk dipakai di Server Action.
 * Mengembalikan null jika belum login atau bukan guru, sehingga action bisa
 * membalas dengan pesan error ke form. Server Action adalah endpoint POST
 * publik, jadi pengecekan ini WAJIB di dalam setiap action guru.
 */
export async function getTeacherFromSession(): Promise<TeacherSession | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "teacher") return null;
  if (!(await isAccountActive(session.user.id))) return null;

  return {
    id: session.user.id,
    name: session.user.name ?? session.user.email ?? "Guru",
    email: session.user.email ?? "",
  };
}

// ── Scope (tahun ajaran aktif + penugasan) ────────────────────────────────────

/**
 * Ambil tahun ajaran aktif beserta seluruh TeachingAssignment milik guru
 * pada tahun ajaran tersebut. Ini sumber kebenaran untuk "guru ini boleh
 * mengelola mapel/kelas apa saja".
 */
export async function getTeacherScope(teacherId: string): Promise<TeacherScope> {
  await connectDB();

  // Pastikan model relasi terdaftar
  void Subject;
  void Class;

  const activeYear = await AcademicYear.findOne({ isActive: true }).lean<{
    _id: unknown;
    year: string;
    semester: "ganjil" | "genap";
  }>();

  if (!activeYear) {
    return { academicYear: null, assignments: [] };
  }

  const raw = await TeachingAssignment.find({
    teacher: teacherId,
    academicYear: activeYear._id,
  })
    .populate("subject", "name code")
    .populate("class", "name grade")
    .lean<
      Array<{
        _id: unknown;
        subject: { _id: unknown; name: string; code: string } | null;
        class: { _id: unknown; name: string; grade: "X" | "XI" | "XII" } | null;
      }>
    >();

  const assignments: TeacherAssignmentItem[] = raw
    .filter((a) => a.subject && a.class)
    .map((a) => ({
      id: String(a._id),
      subjectId: String(a.subject!._id),
      subjectName: a.subject!.name,
      subjectCode: a.subject!.code,
      classId: String(a.class!._id),
      className: a.class!.name,
      grade: a.class!.grade,
    }))
    .sort(
      (a, b) =>
        a.className.localeCompare(b.className) ||
        a.subjectName.localeCompare(b.subjectName),
    );

  return {
    academicYear: {
      id: String(activeYear._id),
      year: activeYear.year,
      semester: activeYear.semester,
    },
    assignments,
  };
}
