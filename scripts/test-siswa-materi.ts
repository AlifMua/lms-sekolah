/**
 * Tes data /siswa/materi: siswa hanya melihat materi PUBLISHED di KELASNYA SENDIRI
 * pada tahun ajaran aktif.
 *
 * Jalankan: npm run test:siswa-materi
 *
 * Memanggil fungsi ASLI listPublishedMateri() di src/lib/student.ts terhadap DB asli.
 * Materi uji berjudul `[SISWA-TEST <run>] ...` dan SELALU dihapus di finally.
 * Tes ini TIDAK menggantikan tes UI manual (tampilan halaman, redirect, dsb).
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
const Material = require("../src/models/Material").default;
const { listPublishedMateri } = require("../src/lib/student") as typeof import("../src/lib/student");
/* eslint-enable @typescript-eslint/no-require-imports */

const RUN_ID = Date.now().toString(36);
const PREFIX = `[SISWA-TEST ${RUN_ID}]`;

type Result = { name: string; pass: boolean; detail: string };
const results: Result[] = [];
function record(name: string, pass: boolean, detail = "") {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? "✅ PASS" : "❌ FAIL"}  ${name}${pass ? "" : `\n         ↳ ${detail}`}`);
}

async function cleanup() {
  try {
    const m = await Material.deleteMany({ title: { $regex: `^\\[SISWA-TEST ${RUN_ID}\\]` } });
    console.log(`\n🧹 Cleanup: ${m.deletedCount} materi uji dihapus.`);
  } catch (err) {
    console.error("⚠️  Cleanup GAGAL — hapus manual materi berjudul diawali", PREFIX, err);
  }
}

async function main() {
  const conn = await connectDB();
  console.log(`🔌 Terhubung ke host: ${conn.connection.host} (db: ${conn.connection.name})`);
  console.log(`🏷️  Run ID: ${RUN_ID}\n`);

  const siswa = await User.findOne({ email: "siswa@sekolah.sch.id", role: "student" }).lean();
  const profile = siswa ? await StudentProfile.findOne({ user: siswa._id }).lean() : null;
  const budi = await User.findOne({ email: "guru@sekolah.sch.id" }).lean();
  const activeYear = await AcademicYear.findOne({ isActive: true }).lean();
  const inactiveYear = await AcademicYear.findOne({ isActive: false }).lean();
  const subject = await Subject.findOne({}).lean();
  if (!siswa || !profile || !budi || !activeYear || !inactiveYear || !subject) {
    throw new Error("Data seed tidak lengkap (siswa/profil/guru/tahun ajaran/mapel).");
  }
  const myClass = await ClassModel.findById(profile.class).lean();
  const otherClass = await ClassModel.findOne({ _id: { $ne: profile.class }, academicYear: activeYear._id }).lean();
  if (!myClass || !otherClass) throw new Error("Kelas siswa / kelas lain tidak ditemukan.");
  console.log(`👨‍🎓 Siswa uji: ${siswa.username} — kelas ${myClass.name}; kelas pembanding: ${otherClass.name}\n`);

  const mk = (suffix: string, klass: unknown, status: "draft" | "published", year: unknown = activeYear._id) =>
    Material.create({
      title: `${PREFIX} ${suffix}`,
      description: "deskripsi uji",
      content: "isi uji",
      subject: subject._id,
      class: klass,
      teacher: budi._id,
      academicYear: year,
      status,
      publishedAt: status === "published" ? new Date() : undefined,
    });

  await mk("PUB-KELAS-SAYA", myClass._id, "published");
  await mk("DRAFT-KELAS-SAYA", myClass._id, "draft");
  await mk("PUB-KELAS-LAIN", otherClass._id, "published");
  await mk("DRAFT-KELAS-LAIN", otherClass._id, "draft");
  await mk("PUB-KELAS-SAYA-TAHUN-NONAKTIF", myClass._id, "published", inactiveYear._id);

  console.log("A. Materi yang dilihat siswa");
  const res = await listPublishedMateri(String(siswa._id));
  const mine = res.items.filter((i) => i.title.startsWith(PREFIX)).map((i) => i.title.replace(`${PREFIX} `, ""));
  record("Kelas yang dikembalikan = kelas siswa", res.className === myClass.name, `className=${res.className}`);
  record("Materi PUBLISHED kelas sendiri → MUNCUL", mine.includes("PUB-KELAS-SAYA"), JSON.stringify(mine));
  record("Materi DRAFT kelas sendiri → TIDAK muncul", !mine.includes("DRAFT-KELAS-SAYA"), JSON.stringify(mine));
  record("Materi PUBLISHED kelas LAIN → TIDAK muncul", !mine.includes("PUB-KELAS-LAIN"), JSON.stringify(mine));
  record("Materi DRAFT kelas lain → TIDAK muncul", !mine.includes("DRAFT-KELAS-LAIN"), JSON.stringify(mine));
  record("Materi published kelas sendiri di tahun ajaran NONAKTIF → TIDAK muncul", !mine.includes("PUB-KELAS-SAYA-TAHUN-NONAKTIF"), JSON.stringify(mine));
  record("Hanya 1 materi uji yang lolos (PUB-KELAS-SAYA)", mine.length === 1, JSON.stringify(mine));
  const hit = res.items.find((i) => i.title === `${PREFIX} PUB-KELAS-SAYA`);
  record("Item berisi nama mapel & nama guru (populate jalan)", !!hit && hit.subjectName !== "—" && hit.teacherName === budi.username, JSON.stringify(hit));

  console.log("\nB. Akun tanpa profil siswa / non-siswa");
  const resBudi = await listPublishedMateri(String(budi._id));
  record("User tanpa StudentProfile (guru Budi) → tidak ada materi & className=null", resBudi.items.length === 0 && resBudi.className === null, JSON.stringify(resBudi).slice(0, 120));
  const resGhost = await listPublishedMateri(new mongoose.Types.ObjectId().toString());
  record("User ID tidak ada → tidak ada materi", resGhost.items.length === 0, JSON.stringify(resGhost).slice(0, 120));

  console.log("\nC. Siswa nonaktif");
  await StudentProfile.updateOne({ _id: profile._id }, { isActive: false });
  try {
    const resOff = await listPublishedMateri(String(siswa._id));
    record("Siswa dgn profil nonaktif → tidak ada materi", resOff.items.length === 0, JSON.stringify(resOff).slice(0, 120));
  } finally {
    await StudentProfile.updateOne({ _id: profile._id }, { isActive: profile.isActive ?? true });
  }
  const restored = await StudentProfile.findById(profile._id).lean();
  record("Profil siswa dikembalikan ke status semula", (restored?.isActive ?? true) === (profile.isActive ?? true), String(restored?.isActive));
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
  console.log("✅ Siswa hanya melihat materi published di kelasnya sendiri.");
}

run();
