/**
 * Seed Script — Memasukkan data awal ke MongoDB
 *
 * Jalankan dengan: npm run seed
 *
 * Data yang dibuat:
 * - 3 user (admin, guru, siswa)
 * - 1 tahun ajaran aktif
 * - 3 jurusan (PPLG, TJKT, DKV)
 * - 3 mata pelajaran
 * - 8 kelas
 * - 1 profil guru + 1 profil siswa
 * - 1 teaching assignment
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// ── Models ──────────────────────────────────────────────────────────────────────
// We use relative imports because tsx doesn't resolve @/* aliases by default.
import User from "../src/models/User";
import AcademicYear from "../src/models/AcademicYear";
import Major from "../src/models/Major";
import Subject from "../src/models/Subject";
import Class from "../src/models/Class";
import StudentProfile from "../src/models/StudentProfile";
import TeacherProfile from "../src/models/TeacherProfile";
import TeachingAssignment from "../src/models/TeachingAssignment";
import SchoolSetting from "../src/models/SchoolSetting";
import Announcement from "../src/models/Announcement";

// ── Helpers ─────────────────────────────────────────────────────────────────────
const SALT_ROUNDS = 12;

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

// ── Main ────────────────────────────────────────────────────────────────────────
async function seed() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("❌ MONGODB_URI belum diatur di .env.local");
    process.exit(1);
  }

  console.log("🔌 Menghubungkan ke MongoDB...");
  await mongoose.connect(mongoUri, { dbName: "lms-sekolah" });
  console.log("✅ Terhubung ke MongoDB (database: lms-sekolah)");

  // ── Bersihkan data lama (hati-hati di production!) ──────────────────────────
  console.log("🗑️  Membersihkan data lama...");
  await Promise.all([
    User.deleteMany({}),
    AcademicYear.deleteMany({}),
    Major.deleteMany({}),
    Subject.deleteMany({}),
    Class.deleteMany({}),
    StudentProfile.deleteMany({}),
    TeacherProfile.deleteMany({}),
    TeachingAssignment.deleteMany({}),
    SchoolSetting.deleteMany({}),
    Announcement.deleteMany({}),
  ]);

  // ── 1. Users ────────────────────────────────────────────────────────────────
  console.log("👤 Membuat users...");
  const [adminPassword, guruPassword, siswaPassword, kepsekPassword] = await Promise.all([
    hashPassword("admin123"),
    hashPassword("guru123"),
    hashPassword("siswa123"),
    hashPassword("kepsek123"),
  ]);

  const [adminUser, guruUser, siswaUser, kepsekUser] = await User.create([
    {
      username: "Admin Sekolah",
      email: "admin@sekolah.sch.id",
      password: adminPassword,
      role: "admin",
    },
    {
      username: "Budi Santoso",
      email: "guru@sekolah.sch.id",
      password: guruPassword,
      role: "teacher",
    },
    {
      username: "Ahmad Fauzi",
      email: "siswa@sekolah.sch.id",
      password: siswaPassword,
      role: "student",
    },
    {
      username: "Dr. Hendra Wijaya, M.Pd.",
      email: "kepsek@sekolah.sch.id",
      password: kepsekPassword,
      role: "principal",
    },
  ]);
  console.log(`   ✅ ${adminUser.email} (admin)`);
  console.log(`   ✅ ${guruUser.email} (teacher)`);
  console.log(`   ✅ ${siswaUser.email} (student)`);
  console.log(`   ✅ ${kepsekUser.email} (principal)`);

  // ── 2. Tahun Ajaran ─────────────────────────────────────────────────────────
  console.log("📅 Membuat tahun ajaran...");
  const [tahunAjaranAktif] = await AcademicYear.create([
    {
      year: "2025/2026",
      semester: "ganjil",
      isActive: true,
      startDate: new Date("2025-07-14"),
      endDate: new Date("2025-12-20"),
    },
    {
      year: "2024/2025",
      semester: "genap",
      isActive: false,
      startDate: new Date("2025-01-06"),
      endDate: new Date("2025-06-21"),
    },
    {
      year: "2024/2025",
      semester: "ganjil",
      isActive: false,
      startDate: new Date("2024-07-15"),
      endDate: new Date("2024-12-21"),
    },
  ]);
  console.log(`   ✅ Tahun ajaran aktif: ${tahunAjaranAktif.year} (${tahunAjaranAktif.semester})`);

  // ── 3. Jurusan ──────────────────────────────────────────────────────────────
  console.log("🏫 Membuat jurusan...");
  const [pplg, tjkt, dkv] = await Major.create([
    {
      name: "Pengembangan Perangkat Lunak dan Gim",
      abbreviation: "PPLG",
      slug: "pplg",
      description: "Jurusan yang mempelajari pemrograman, pengembangan perangkat lunak, dan game development.",
    },
    {
      name: "Teknik Jaringan Komputer dan Telekomunikasi",
      abbreviation: "TJKT",
      slug: "tjkt",
      description: "Jurusan yang mempelajari jaringan komputer, administrasi server, dan telekomunikasi.",
    },
    {
      name: "Desain Komunikasi Visual",
      abbreviation: "DKV",
      slug: "dkv",
      description: "Jurusan yang mempelajari desain grafis, multimedia, dan komunikasi visual.",
    },
  ]);
  console.log(`   ✅ ${pplg.abbreviation}, ${tjkt.abbreviation}, ${dkv.abbreviation}`);

  // ── 4. Mata Pelajaran ───────────────────────────────────────────────────────
  console.log("📚 Membuat mata pelajaran...");
  const [mapelWeb, mapelBasisData, , , , mapelInggris] = await Subject.create([
    { name: "Pemrograman Web", code: "PWB-001", category: "kejuruan" as const },
    { name: "Basis Data", code: "BD-001", category: "kejuruan" as const },
    { name: "Desain Grafis", code: "DG-001", category: "kejuruan" as const },
    { name: "Matematika", code: "MTK-001", category: "umum" as const },
    { name: "Bahasa Indonesia", code: "BIN-001", category: "umum" as const },
    { name: "Bahasa Inggris", code: "BIG-001", category: "umum" as const },
  ]);
  console.log(`   ✅ 6 mata pelajaran dibuat`);

  // ── 5. Kelas ────────────────────────────────────────────────────────────────
  console.log("🏠 Membuat kelas...");
  const classesData = [
    { name: "X PPLG 1", grade: "X" as const, major: pplg._id },
    { name: "X PPLG 2", grade: "X" as const, major: pplg._id },
    { name: "XI PPLG 1", grade: "XI" as const, major: pplg._id },
    { name: "XII PPLG 1", grade: "XII" as const, major: pplg._id },
    { name: "X TJKT 1", grade: "X" as const, major: tjkt._id },
    { name: "XI TJKT 1", grade: "XI" as const, major: tjkt._id },
    { name: "X DKV 1", grade: "X" as const, major: dkv._id },
    { name: "XI DKV 1", grade: "XI" as const, major: dkv._id },
  ];

  const classes = await Class.create(
    classesData.map((c) => ({
      ...c,
      academicYear: tahunAjaranAktif._id,
      // Wali kelas pertama kelas XI PPLG 1 = guru Budi
      ...(c.name === "XI PPLG 1" ? { homeroomTeacher: guruUser._id } : {}),
    })),
  );
  console.log(`   ✅ ${classes.length} kelas dibuat`);

  // Cari kelas XI PPLG 1 & XI TJKT 1
  const kelasXIPPLG1 = classes.find((c: { name: string }) => c.name === "XI PPLG 1")!;
  const kelasXITJKT1 = classes.find((c: { name: string }) => c.name === "XI TJKT 1")!;

  // ── 6. Profil Guru ──────────────────────────────────────────────────────────
  console.log("👨‍🏫 Membuat profil guru...");
  const guruProfile = await TeacherProfile.create({
    user: guruUser._id,
    nip: "198105152008011003",
    specialization: "Pemrograman Web & Basis Data",
    isActive: true,
  });
  console.log(`   ✅ Profil guru: ${guruUser.username} (NIP: ${guruProfile.nip})`);

  // ── 7. Profil Siswa ─────────────────────────────────────────────────────────
  console.log("👨‍🎓 Membuat profil siswa...");
  const siswaProfile = await StudentProfile.create({
    user: siswaUser._id,
    nis: "2025001",
    class: kelasXIPPLG1._id,
    major: pplg._id,
    enrollmentYear: 2025,
    isActive: true,
  });
  console.log(`   ✅ Profil siswa: ${siswaUser.username} (NIS: ${siswaProfile.nis})`);

  // ── 8. Teaching Assignment ──────────────────────────────────────────────────
  console.log("📋 Membuat penugasan mengajar...");
  const assignments = await TeachingAssignment.create([
    {
      teacher: guruUser._id,
      subject: mapelWeb._id,
      class: kelasXIPPLG1._id,
      academicYear: tahunAjaranAktif._id,
    },
    {
      teacher: guruUser._id,
      subject: mapelBasisData._id,
      class: kelasXIPPLG1._id,
      academicYear: tahunAjaranAktif._id,
    },
    {
      teacher: guruUser._id,
      subject: mapelInggris._id,
      class: kelasXIPPLG1._id,
      academicYear: tahunAjaranAktif._id,
    },
    {
      teacher: guruUser._id,
      subject: mapelWeb._id,
      class: kelasXITJKT1._id,
      academicYear: tahunAjaranAktif._id,
    },
  ]);
  console.log(`   ✅ ${assignments.length} penugasan mengajar dibuat`);

  // ── 9. School Setting ──────────────────────────────────────────────────────
  console.log("🏢 Membuat profil sekolah...");
  await SchoolSetting.create({
    schoolName: "SMK Negeri 1 Maju Bersama",
    npsn: "20104050",
    address: "Jl. Pendidikan No. 123, Jakarta",
    phone: "(021) 555-1234",
    email: "info@sekolah.sch.id",
    principalName: "Dr. Hendra Wijaya, M.Pd.",
  });
  console.log("   ✅ Profil sekolah dibuat");

  // ── 10. Pengumuman ──────────────────────────────────────────────────────────
  console.log("📢 Membuat pengumuman awal...");
  await Announcement.create({
    title: "Selamat Datang di LMS Sekolah",
    content: "Selamat datang di tahun ajaran baru 2025/2026. Seluruh civitas akademika diharapkan memanfaatkan platform ini sebaik-baiknya.",
    author: adminUser._id,
    targetRole: "all",
    pinned: true,
  });
  console.log("   ✅ Pengumuman awal dibuat");

  // ── Selesai ─────────────────────────────────────────────────────────────────
  console.log("\n🎉 Seed berhasil! Ringkasan:");
  console.log("   • 4 users (admin, guru, siswa, principal)");
  console.log("   • 3 tahun ajaran");
  console.log("   • 3 jurusan");
  console.log("   • 6 mata pelajaran");
  console.log("   • 8 kelas");
  console.log("   • 1 profil guru + 1 profil siswa");
  console.log("   • 2 penugasan mengajar");
  console.log("   • 1 profil sekolah");
  console.log("   • 1 pengumuman");
  console.log("\n📧 Akun login:");
  console.log("   admin@sekolah.sch.id  / admin123");
  console.log("   guru@sekolah.sch.id   / guru123");
  console.log("   siswa@sekolah.sch.id  / siswa123");
  console.log("   kepsek@sekolah.sch.id / kepsek123");

  await mongoose.disconnect();
  console.log("\n🔌 Disconnected dari MongoDB.");
}

seed().catch((err) => {
  console.error("❌ Seed gagal:", err);
  process.exit(1);
});
