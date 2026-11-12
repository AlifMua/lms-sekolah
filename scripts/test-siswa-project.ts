/**
 * Tes data /siswa/project: siswa hanya melihat project di KELASNYA SENDIRI pada
 * tahun ajaran aktif, dan pengumpulan yang tampil hanya milik siswa itu sendiri.
 *
 * Jalankan: npm run test:siswa-project
 *
 * Memanggil fungsi ASLI listStudentProjects() di src/lib/student.ts terhadap DB asli.
 * Data uji berjudul `[PROJECT-TEST <run>] ...` dan SELALU dihapus di finally.
 * Tes ini TIDAK menggantikan tes UI manual.
 */

import mongoose from "mongoose";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Module = require("module");

const originalLoad = Module._load;
Module._load = function (request: string, ...rest: unknown[]) {
  if (request === "next-auth") return { getServerSession: async () => null };
  if (request === "next/navigation") {
    return {
      redirect: (to: string) => {
        throw new Error(`NEXT_REDIRECT:${to}`);
      },
    };
  }
  return originalLoad.call(this, request, ...rest);
};

/* eslint-disable @typescript-eslint/no-require-imports */
const { connectDB } = require("../src/lib/mongodb");
const User = require("../src/models/User").default;
const StudentProfile = require("../src/models/StudentProfile").default;
const AcademicYear = require("../src/models/AcademicYear").default;
const ClassModel = require("../src/models/Class").default;
const Subject = require("../src/models/Subject").default;
const Project = require("../src/models/Project").default;
const ProjectSubmission = require("../src/models/ProjectSubmission").default;
const { listStudentProjects } = require("../src/lib/student") as typeof import("../src/lib/student");
/* eslint-enable @typescript-eslint/no-require-imports */

const RUN_ID = Date.now().toString(36);
const PREFIX = `[PROJECT-TEST ${RUN_ID}]`;

type Result = { name: string; pass: boolean; detail: string };
const results: Result[] = [];
function record(name: string, pass: boolean, detail = "") {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? "✅ PASS" : "❌ FAIL"}  ${name}${pass ? "" : `\n         ↳ ${detail}`}`);
}

async function cleanup() {
  try {
    const projects = await Project.find({ title: { $regex: `^\\[PROJECT-TEST ${RUN_ID}\\]` } }).select("_id").lean();
    const ids = projects.map((p: { _id: unknown }) => p._id);
    const s = await ProjectSubmission.deleteMany({ project: { $in: ids } });
    const p = await Project.deleteMany({ _id: { $in: ids } });
    console.log(`\n🧹 Cleanup: ${p.deletedCount} project & ${s.deletedCount} pengumpulan uji dihapus.`);
  } catch (err) {
    console.error("⚠️  Cleanup GAGAL — hapus manual project berjudul diawali", PREFIX, err);
  }
}

async function main() {
  const conn = await connectDB();
  console.log(`🔌 Terhubung ke host: ${conn.connection.host} (db: ${conn.connection.name})`);
  console.log(`🏷️  Run ID: ${RUN_ID}\n`);

  const siswa = await User.findOne({ email: "siswa@sekolah.sch.id", role: "student" }).lean();
  const profile = siswa ? await StudentProfile.findOne({ user: siswa._id }).lean() : null;
  const guru = await User.findOne({ email: "guru@sekolah.sch.id" }).lean();
  const activeYear = await AcademicYear.findOne({ isActive: true }).lean();
  const inactiveYear = await AcademicYear.findOne({ isActive: false }).lean();
  const subject = await Subject.findOne({}).lean();
  if (!siswa || !profile || !guru || !activeYear || !inactiveYear || !subject) {
    throw new Error("Data seed tidak lengkap (siswa/profil/guru/tahun ajaran/mapel).");
  }
  const myClass = await ClassModel.findById(profile.class).lean();
  const otherClass = await ClassModel.findOne({ _id: { $ne: profile.class }, academicYear: activeYear._id }).lean();
  if (!myClass || !otherClass) throw new Error("Kelas siswa / kelas lain tidak ditemukan.");
  console.log(`👨‍🎓 Siswa uji: ${siswa.username} — kelas ${myClass.name}; kelas pembanding: ${otherClass.name}\n`);

  const future = new Date(Date.now() + 7 * 86_400_000);
  const past = new Date(Date.now() - 86_400_000);
  const mk = (suffix: string, klass: unknown, deadline: Date, status: "active" | "closed" = "active", year: unknown = activeYear._id) =>
    Project.create({
      title: `${PREFIX} ${suffix}`,
      description: "deskripsi uji",
      subject: subject._id,
      class: klass,
      teacher: guru._id,
      academicYear: year,
      deadline,
      status,
    });

  const mine = await mk("KELAS-SAYA", myClass._id, future);
  await mk("KELAS-LAIN", otherClass._id, future);
  await mk("KELAS-SAYA-TAHUN-NONAKTIF", myClass._id, future, "active", inactiveYear._id);
  const closed = await mk("KELAS-SAYA-DITUTUP", myClass._id, future, "closed");
  const pastP = await mk("KELAS-SAYA-LEWAT", myClass._id, past);

  console.log("A. Cakupan project");
  let res = await listStudentProjects(String(siswa._id));
  const titles = res.items.filter((i) => i.title.startsWith(PREFIX)).map((i) => i.title.replace(`${PREFIX} `, ""));
  record("Project kelas sendiri → MUNCUL", titles.includes("KELAS-SAYA"), JSON.stringify(titles));
  record("Project kelas LAIN → TIDAK muncul", !titles.includes("KELAS-LAIN"), JSON.stringify(titles));
  record("Project tahun ajaran NONAKTIF → TIDAK muncul", !titles.includes("KELAS-SAYA-TAHUN-NONAKTIF"), JSON.stringify(titles));
  record("Project ditutup tetap tampil dgn projectStatus=closed", res.items.find((i) => i._id === String(closed._id))?.projectStatus === "closed");
  record("Project lewat deadline ditandai isPastDeadline", res.items.find((i) => i._id === String(pastP._id))?.isPastDeadline === true);
  record("Tepat 3 project uji yang lolos (saya, ditutup, lewat)", titles.length === 3, JSON.stringify(titles));

  console.log("\nB. Pengumpulan");
  await ProjectSubmission.create({ project: mine._id, student: siswa._id, content: "jawaban saya", submittedAt: new Date() });
  // Pengumpulan siswa LAIN pada project yang sama tidak boleh bocor
  const otherStudent = await User.findOne({ role: "student", _id: { $ne: siswa._id } }).lean();
  if (otherStudent) {
    await ProjectSubmission.create({ project: mine._id, student: otherStudent._id, content: "jawaban orang lain", submittedAt: new Date() });
  }
  res = await listStudentProjects(String(siswa._id));
  const item = res.items.find((i) => i._id === String(mine._id));
  record("Pengumpulan sendiri tampil", item?.submission?.content === "jawaban saya", JSON.stringify(item?.submission));
  record("Status ontime dihitung otomatis dari deadline", item?.submission?.submissionStatus === "ontime", JSON.stringify(item?.submission));
  if (otherStudent) {
    record("Pengumpulan siswa lain TIDAK bocor", item?.submission?.content !== "jawaban orang lain");
  } else {
    console.log("  ⏭️  (hanya ada 1 siswa — tes kebocoran pengumpulan dilewati)");
  }
  record("Project tanpa pengumpulan → submission null", res.items.find((i) => i._id === String(closed._id))?.submission === null);

  console.log("\nC. Akun tanpa profil / siswa nonaktif");
  const resGuru = await listStudentProjects(String(guru._id));
  record("User tanpa StudentProfile → kosong & className=null", resGuru.items.length === 0 && resGuru.className === null);
  await StudentProfile.updateOne({ _id: profile._id }, { isActive: false });
  try {
    const off = await listStudentProjects(String(siswa._id));
    record("Siswa nonaktif → tidak ada project", off.items.length === 0);
  } finally {
    await StudentProfile.updateOne({ _id: profile._id }, { isActive: profile.isActive ?? true });
  }
}

async function run() {
  process.on("SIGINT", async () => {
    await cleanup();
    process.exit(130);
  });

  let fatal: unknown;
  try {
    await main();
  } catch (err) {
    fatal = err;
  } finally {
    await cleanup();
    await mongoose.disconnect();
  }

  if (fatal) {
    console.error("\n💥 Tes tidak dapat diselesaikan:", fatal);
    process.exit(2);
  }
  const failed = results.filter((r) => !r.pass);
  console.log(`\n══════════ HASIL: ${results.length - failed.length}/${results.length} lulus ══════════`);
  if (failed.length) {
    console.log("❌ ADA TES GAGAL:");
    for (const f of failed) console.log(`   - ${f.name}\n       ${f.detail}`);
    process.exit(1);
  }
  console.log("✅ Siswa hanya melihat project di kelasnya sendiri.");
}

run();
