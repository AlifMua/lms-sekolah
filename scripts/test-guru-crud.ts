/**
 * Tes CRUD Guru (server action admin) terhadap DB asli.
 *
 * Jalankan: npm run test:guru-crud
 *
 * - Memanggil fungsi ASLI di src/actions/admin/guru.ts. Hanya `next-auth`
 *   (getServerSession), `next/cache` dan `next/navigation` yang dipalsukan.
 * - Semua data uji memakai email `*@test.invalid` + NIP unik per-run dan SELALU
 *   dihapus di blok finally. Data seed/guru nyata tidak disentuh.
 * - Exit code 1 jika ada tes gagal.
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Module = require("module");

type FakeSession = { user: { id: string; role: string; name?: string; email?: string } } | null;
let currentSession: FakeSession = null;

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
const { authOptions } = require("../src/lib/auth");
const guru = require("../src/actions/admin/guru") as typeof import("../src/actions/admin/guru");
const materi = require("../src/actions/guru/materi") as typeof import("../src/actions/guru/materi");
/* eslint-enable @typescript-eslint/no-require-imports */

const { createGuru, updateGuru, setGuruActive } = guru;

const RUN_ID = Date.now().toString(36);
// NIP unik per-run (hanya digit): 99 + 16 digit dari waktu
const nipOf = (n: number) => `99${Date.now().toString().padStart(13, "0")}${n}`.slice(0, 18);
const emailOf = (tag: string) => `guru-test-${tag}-${RUN_ID}@test.invalid`;

type Result = { name: string; pass: boolean; detail: string };
const results: Result[] = [];
function record(name: string, pass: boolean, detail = "") {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? "✅ PASS" : "❌ FAIL"}  ${name}${pass ? "" : `\n         ↳ ${detail}`}`);
}

const asSession = (id: string, role: string): FakeSession => ({
  user: { id, role, name: role, email: `${role}@test.invalid` },
});
const ADMIN = asSession(new mongoose.Types.ObjectId().toString(), "admin");

function form(f: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(f)) fd.set(k, v);
  return fd;
}
const guruForm = (o: { name?: string; email: string; nip: string; specialization?: string; password?: string }) =>
  form({
    name: o.name ?? `Guru Uji ${RUN_ID}`,
    email: o.email,
    nip: o.nip,
    specialization: o.specialization ?? "",
    password: o.password ?? "",
  });

const countTestUsers = () => User.countDocuments({ email: { $regex: `-${RUN_ID}@test\\.invalid$` } });
const msg = (s: { error?: string; fieldErrors?: Record<string, string[]> }) =>
  s.error ?? JSON.stringify(s.fieldErrors ?? {});

async function authorize(email: string, password: string) {
  const provider = authOptions.providers[0] as any;
  return provider.options.authorize({ email, password }, {} as any);
}

async function cleanup() {
  try {
    const users = await User.find({ email: { $regex: `-${RUN_ID}@test\\.invalid$` } })
      .select("_id")
      .lean();
    const ids = users.map((u: any) => u._id);
    const p = await TeacherProfile.deleteMany({ user: { $in: ids } });
    const u = await User.deleteMany({ _id: { $in: ids } });
    console.log(`\n🧹 Cleanup: ${p.deletedCount} profil guru, ${u.deletedCount} user sementara dihapus.`);
  } catch (err) {
    console.error("⚠️  Cleanup GAGAL — hapus manual user *-" + RUN_ID + "@test.invalid", err);
  }
}

async function main() {
  const conn = await connectDB();
  console.log(`🔌 Terhubung ke host: ${conn.connection.host} (db: ${conn.connection.name})`);
  console.log(`🏷️  Run ID: ${RUN_ID}\n`);

  const budi = await User.findOne({ email: "guru@sekolah.sch.id" }).lean();
  const budiProfile = budi ? await TeacherProfile.findOne({ user: budi._id }).lean() : null;
  if (!budi || !budiProfile) throw new Error("Guru seed (Budi) tidak ditemukan. Jalankan `npm run seed`.");

  const NIP1 = nipOf(1);
  const NIP2 = nipOf(2);
  const E1 = emailOf("a");
  const E2 = emailOf("b");

  // ── A. Hanya admin ──────────────────────────────────────────────────────
  console.log("A. Hak akses — hanya admin yang boleh mengelola guru");
  for (const [label, sess] of [
    ["tanpa login", null],
    ["login sebagai guru", asSession(String(budi._id), "teacher")],
    ["login sebagai siswa", asSession(String(budi._id), "student")],
  ] as Array<[string, FakeSession]>) {
    currentSession = sess;
    const before = await countTestUsers();
    const r = await createGuru({}, guruForm({ email: emailOf("x"), nip: nipOf(9), password: "rahasia1" }));
    record(
      `createGuru ${label} → ditolak & tidak ada user baru`,
      !r.success && /sesi tidak valid/i.test(msg(r)) && (await countTestUsers()) === before,
      msg(r),
    );
  }

  // ── B. Tambah guru ──────────────────────────────────────────────────────
  console.log("\nB. Tambah guru");
  currentSession = ADMIN;
  const c1 = await createGuru({}, guruForm({ name: "Guru Uji Satu", email: E1.toUpperCase(), nip: NIP1, specialization: "Fisika", password: "rahasia1" }));
  const u1 = await User.findOne({ email: E1 }).lean();
  const p1 = u1 ? await TeacherProfile.findOne({ user: u1._id }).lean() : null;
  record("createGuru (admin) → BERHASIL", !!c1.success && !!u1 && !!p1, msg(c1));
  record("User role=teacher, email di-lowercase, isActive=true", u1?.role === "teacher" && u1?.email === E1 && u1?.isActive === true, JSON.stringify(u1));
  record("TeacherProfile terhubung ke User, NIP & spesialisasi tersimpan, isActive=true", p1?.nip === NIP1 && p1?.specialization === "Fisika" && p1?.isActive === true, JSON.stringify(p1));
  record(
    "Password TIDAK disimpan plain-text: hash bcrypt & cocok dgn 'rahasia1'",
    !!u1 && u1.password !== "rahasia1" && /^\$2[aby]\$/.test(u1.password) && (await bcrypt.compare("rahasia1", u1.password)),
    String(u1?.password).slice(0, 12),
  );
  const loginOk = await authorize(E1, "rahasia1").catch((e: Error) => e);
  record("Guru baru bisa login (authorize) dgn email+password", !(loginOk instanceof Error) && loginOk?.role === "teacher", String(loginOk));

  // ── C. Duplikat ─────────────────────────────────────────────────────────
  console.log("\nC. Duplikat NIP / email");
  let before = await countTestUsers();
  const dNip = await createGuru({}, guruForm({ email: E2, nip: NIP1, password: "rahasia1" }));
  record("NIP duplikat (email baru) → fieldErrors.nip jelas, tidak ada user baru", !dNip.success && /NIP .* sudah terdaftar/.test(dNip.fieldErrors?.nip?.[0] ?? "") && (await countTestUsers()) === before, msg(dNip));
  const dNipSeed = await createGuru({}, guruForm({ email: E2, nip: budiProfile.nip, password: "rahasia1" }));
  record("NIP duplikat dengan guru SEED (Budi) → ditolak", !dNipSeed.success && !!dNipSeed.fieldErrors?.nip, msg(dNipSeed));
  const dMail = await createGuru({}, guruForm({ email: E1, nip: NIP2, password: "rahasia1" }));
  record("Email duplikat (NIP baru) → fieldErrors.email jelas, tidak ada profil NIP baru", !dMail.success && /Email .* sudah terdaftar/.test(dMail.fieldErrors?.email?.[0] ?? "") && !(await TeacherProfile.exists({ nip: NIP2 })), msg(dMail));
  const dMailCase = await createGuru({}, guruForm({ email: E1.toUpperCase(), nip: NIP2, password: "rahasia1" }));
  record("Email duplikat beda huruf besar/kecil → ditolak", !dMailCase.success && !!dMailCase.fieldErrors?.email, msg(dMailCase));
  const dBoth = await createGuru({}, guruForm({ email: E1, nip: NIP1, password: "rahasia1" }));
  record("NIP & email sama-sama duplikat → kedua error muncul", !!dBoth.fieldErrors?.nip && !!dBoth.fieldErrors?.email, msg(dBoth));
  const dSeedMail = await createGuru({}, guruForm({ email: "guru@sekolah.sch.id", nip: NIP2, password: "rahasia1" }));
  record("Email duplikat dengan akun SEED → ditolak", !dSeedMail.success && !!dSeedMail.fieldErrors?.email, msg(dSeedMail));

  // ── D. Validasi ─────────────────────────────────────────────────────────
  console.log("\nD. Validasi input");
  before = await countTestUsers();
  const v1 = await createGuru({}, guruForm({ email: emailOf("v"), nip: nipOf(8), password: "123" }));
  record("Password < 6 karakter → ditolak", !v1.success && !!v1.fieldErrors?.password, msg(v1));
  const v2 = await createGuru({}, guruForm({ email: emailOf("v"), nip: "ABC-123", password: "rahasia1" }));
  record("NIP bukan angka → ditolak", !v2.success && !!v2.fieldErrors?.nip, msg(v2));
  const v3 = await createGuru({}, guruForm({ email: "bukan-email", nip: nipOf(8), password: "rahasia1" }));
  record("Email format salah → ditolak", !v3.success && !!v3.fieldErrors?.email, msg(v3));
  const v4 = await createGuru({}, guruForm({ name: "ab", email: emailOf("v"), nip: nipOf(8), password: "rahasia1" }));
  record("Nama < 3 karakter → ditolak", !v4.success && !!v4.fieldErrors?.name, msg(v4));
  record("Tidak ada user tertulis dari input invalid", (await countTestUsers()) === before, "");

  // ── E. Edit ─────────────────────────────────────────────────────────────
  console.log("\nE. Edit guru");
  const PID = String(p1!._id);
  const hashBefore = u1!.password;
  const e1 = await updateGuru(PID, {}, guruForm({ name: "Guru Uji Satu (Edit)", email: E1, nip: NIP1, specialization: "Kimia", password: "" }));
  const u1b = await User.findById(u1!._id).lean();
  const p1b = await TeacherProfile.findById(PID).lean();
  record("Edit nama/spesialisasi dgn email & NIP milik sendiri (tanpa password) → BERHASIL", !!e1.success && u1b?.username === "Guru Uji Satu (Edit)" && p1b?.specialization === "Kimia", msg(e1));
  record("Password kosong saat edit → hash TIDAK berubah", u1b?.password === hashBefore, "hash berubah");
  const e2 = await updateGuru(PID, {}, guruForm({ name: "Guru Uji Satu (Edit)", email: E1, nip: NIP1, password: "baru-pass-2" }));
  const u1c = await User.findById(u1!._id).lean();
  record("Edit dgn password baru → hash berubah, login lama gagal, login baru berhasil",
    !!e2.success && u1c?.password !== hashBefore && /^\$2[aby]\$/.test(u1c?.password) &&
      (await authorize(E1, "rahasia1").then(() => false).catch(() => true)) &&
      (await authorize(E1, "baru-pass-2").then((x: any) => x?.role === "teacher").catch(() => false)),
    msg(e2));
  const e3 = await updateGuru(PID, {}, guruForm({ email: E1, nip: budiProfile.nip, password: "" }));
  record("Edit NIP → NIP milik guru lain (Budi) → ditolak, NIP tidak berubah", !e3.success && !!e3.fieldErrors?.nip && (await TeacherProfile.findById(PID).lean())?.nip === NIP1, msg(e3));
  const e4 = await updateGuru(PID, {}, guruForm({ email: "guru@sekolah.sch.id", nip: NIP1, password: "" }));
  record("Edit email → email milik guru lain → ditolak, email tidak berubah", !e4.success && !!e4.fieldErrors?.email && (await User.findById(u1!._id).lean())?.email === E1, msg(e4));
  const e5 = await updateGuru(new mongoose.Types.ObjectId().toString(), {}, guruForm({ email: emailOf("n"), nip: nipOf(7) }));
  record("Edit guru yang tidak ada → ditolak", !e5.success && /tidak ditemukan/i.test(msg(e5)), msg(e5));
  const e6 = await updateGuru("bukan-objectid", {}, guruForm({ email: emailOf("n"), nip: nipOf(7) }));
  record("Edit dgn id ngawur → ditolak", !e6.success && /tidak ditemukan/i.test(msg(e6)), msg(e6));
  currentSession = asSession(String(budi._id), "teacher");
  const e7 = await updateGuru(PID, {}, guruForm({ name: "Diretas Guru Lain", email: E1, nip: NIP1 }));
  record("Edit oleh role guru → ditolak & data tidak berubah", !e7.success && (await User.findById(u1!._id).lean())?.username === "Guru Uji Satu (Edit)", msg(e7));
  currentSession = ADMIN;

  // ── F. Nonaktifkan ──────────────────────────────────────────────────────
  console.log("\nF. Nonaktifkan / aktifkan");
  const T1 = String(u1!._id);
  const fakeIdAssign = new mongoose.Types.ObjectId().toString();
  const materiForm = () => form({ title: "tes nonaktif", description: "deskripsi", content: "isi", assignmentId: fakeIdAssign, status: "draft" });
  currentSession = asSession(T1, "teacher");
  const activeTry = await materi.createMateri({}, materiForm());
  record("Kontrol: guru AKTIF lolos guard sesi (ditolak karena tak ada penugasan, BUKAN karena sesi)", !activeTry.success && /tidak ditugaskan/i.test(msg(activeTry)), msg(activeTry));
  currentSession = asSession(T1, "teacher");
  const sNon = await setGuruActive(PID, false);
  record("setGuruActive(false) oleh guru → ditolak", !sNon.success && /sesi tidak valid/i.test(msg(sNon)) && (await User.findById(T1).lean())?.isActive === true, msg(sNon));
  currentSession = ADMIN;
  const off = await setGuruActive(PID, false);
  const uOff = await User.findById(T1).lean();
  const pOff = await TeacherProfile.findById(PID).lean();
  record("Admin nonaktifkan → User.isActive=false & TeacherProfile.isActive=false", !!off.success && uOff?.isActive === false && pOff?.isActive === false, msg(off));
  const loginOff = await authorize(E1, "baru-pass-2").then(() => null).catch((e: Error) => e.message);
  record("Guru nonaktif TIDAK bisa login (pesan: dinonaktifkan)", /dinonaktifkan/i.test(String(loginOff)), String(loginOff));
  currentSession = asSession(T1, "teacher"); // JWT lama masih "valid"
  const staleTry = await materi.createMateri({}, materiForm());
  record("Guru nonaktif dgn sesi/JWT lama → server action ditolak ('sesi tidak valid')", !staleTry.success && /sesi tidak valid/i.test(msg(staleTry)), msg(staleTry));
  currentSession = ADMIN;
  const on = await setGuruActive(PID, true);
  const loginOn = await authorize(E1, "baru-pass-2").then((x: any) => x?.role).catch((e: Error) => e.message);
  record("Admin aktifkan kembali → bisa login lagi", !!on.success && loginOn === "teacher", String(loginOn));
  const sBad = await setGuruActive("bukan-objectid", false);
  record("setGuruActive id ngawur → ditolak", !sBad.success, msg(sBad));
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
  console.log("✅ Semua skenario CRUD guru sesuai harapan.");
}

run();
