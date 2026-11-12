/**
 * Tes data halaman /admin/penugasan terhadap DB asli.
 *
 * Jalankan: npm run test:penugasan-data
 *
 * Memanggil fungsi ASLI getPenugasanPageData() dan membuktikan:
 *  (a) dropdown guru (guruList) TIDAK memuat guru nonaktif
 *  (b) tabel (penugasanList) TETAP memuat penugasan guru nonaktif LENGKAP dengan NIP
 *
 * Data uji (guru nonaktif + profil + penugasan) memakai email `*@test.invalid`
 * dan SELALU dihapus di blok finally. Data nyata tidak diubah.
 */

import mongoose from "mongoose";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Module = require("module");

// Sesi admin palsu: hanya next-auth, next/cache & next/navigation yang dipalsukan.
let currentSession: { user: { id: string; role: string; name?: string; email?: string } } | null = null;

const originalLoad = Module._load;
Module._load = function (request: string, ...rest: unknown[]) {
  if (request === "next-auth") return { getServerSession: async () => currentSession };
  if (request === "next/cache") return { revalidatePath: () => {}, revalidateTag: () => {} };
  if (request === "next/navigation") {
    return {
      redirect: (to: string) => {
        throw new Error(`NEXT_REDIRECT:${to}`);
      },
    };
  }
  return originalLoad.call(this, request, ...rest);
};

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */
const { connectDB } = require("../src/lib/mongodb");
const User = require("../src/models/User").default;
const TeacherProfile = require("../src/models/TeacherProfile").default;
const TeachingAssignment = require("../src/models/TeachingAssignment").default;
const Subject = require("../src/models/Subject").default;
const Class = require("../src/models/Class").default;
const AcademicYear = require("../src/models/AcademicYear").default;
const { getPenugasanPageData } = require("../src/lib/penugasan-data") as typeof import("../src/lib/penugasan-data");
const { createGuru, setGuruActive } = require("../src/actions/admin/guru") as typeof import("../src/actions/admin/guru");
/* eslint-enable @typescript-eslint/no-require-imports */

const RUN_ID = Date.now().toString(36);
const NIP = `88${Date.now().toString().slice(-12)}`;

let failed = 0;
function check(name: string, pass: boolean, detail = "") {
  if (!pass) failed++;
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? `\n         -> ${detail}` : ""}`);
}

async function main() {
  await connectDB();
  const created: { user?: any; profile?: any; assignment?: any } = {};
  try {
    const [subject, kelas, year] = await Promise.all([
      Subject.findOne({}).lean(),
      Class.findOne({}).lean(),
      AcademicYear.findOne({}).lean(),
    ]);
    if (!subject || !kelas || !year) throw new Error("DB butuh minimal 1 mapel, kelas, tahun ajaran (jalankan seed).");

    currentSession = { user: { id: new mongoose.Types.ObjectId().toString(), role: "admin", name: "admin", email: "admin@test.invalid" } };

    // Guru dibuat lewat createGuru, lalu DINONAKTIFKAN lewat setGuruActive
    // (server action yang sama dengan tombol power di /admin/guru).
    const fd = new FormData();
    fd.set("name", `Guru Nonaktif ${RUN_ID}`);
    fd.set("email", `penugasan-nonaktif-${RUN_ID}@test.invalid`);
    fd.set("nip", NIP);
    fd.set("specialization", "");
    fd.set("password", "rahasia1");
    const made = await createGuru({}, fd);
    if (!made.success) throw new Error(`createGuru gagal: ${JSON.stringify(made)}`);
    created.user = await User.findOne({ email: `penugasan-nonaktif-${RUN_ID}@test.invalid` });
    created.profile = await TeacherProfile.findOne({ user: created.user._id });

    const off = await setGuruActive(String(created.profile._id), false);
    console.log(`setGuruActive(profileId, false) -> ${JSON.stringify(off)}`);
    if (!off.success) throw new Error("setGuruActive gagal");
    created.assignment = await TeachingAssignment.create({
      teacher: created.user._id,
      subject: subject._id,
      class: kelas._id,
      academicYear: year._id,
    });

    const data = await getPenugasanPageData();
    const uid = String(created.user._id);

    console.log(`\nGuru uji nonaktif: ${created.user.username}  NIP=${NIP}`);
    console.log(`guruList (dropdown): ${data.guruList.length} guru -> ${data.guruList.map((g) => g.username).join(", ")}`);
    const row = data.penugasanList.find((r) => r._id === String(created.assignment._id));
    console.log(`penugasanList (tabel): ${data.penugasanList.length} baris`);
    console.log(`Baris guru nonaktif: ${JSON.stringify(row)}\n`);

    check("(a) dropdown guruList TIDAK memuat guru nonaktif", !data.guruList.some((g) => g._id === uid));
    const allInactive = await User.find({ role: "teacher", isActive: false }).select("_id").lean();
    const inactiveIds = new Set(allInactive.map((u: any) => String(u._id)));
    check(
      "(a) dropdown tidak memuat SATU PUN guru nonaktif di DB",
      !data.guruList.some((g) => inactiveIds.has(g._id)),
      `${inactiveIds.size} guru nonaktif di DB`,
    );
    check("(b) tabel memuat penugasan guru nonaktif", !!row);
    check("(b) tabel menampilkan NIP guru nonaktif (bukan '-')", row?.teacherNip === NIP, `teacherNip=${row?.teacherNip}`);

    // Aktifkan lagi lewat setGuruActive: guru kembali muncul di dropdown, NIP di tabel tetap.
    const on = await setGuruActive(String(created.profile._id), true);
    const data2 = await getPenugasanPageData();
    const row2 = data2.penugasanList.find((r) => r._id === String(created.assignment._id));
    check("(c) setelah diaktifkan lagi, guru muncul kembali di dropdown", on.success === true && data2.guruList.some((g) => g._id === uid));
    check("(c) NIP di tabel tetap tampil", row2?.teacherNip === NIP, `teacherNip=${row2?.teacherNip}`);
  } finally {
    if (created.assignment) await TeachingAssignment.deleteOne({ _id: created.assignment._id });
    if (created.profile) await TeacherProfile.deleteOne({ _id: created.profile._id });
    if (created.user) await User.deleteOne({ _id: created.user._id });
    await mongoose.disconnect();
  }
  console.log(`\n${failed === 0 ? "SEMUA TES LULUS" : `${failed} TES GAGAL`}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
