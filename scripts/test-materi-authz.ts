/**
 * Tes otorisasi NEGATIF untuk server action Materi.
 *
 * Jalankan: npm run test:materi-authz
 *
 * Yang dites: guru (Budi) TIDAK bisa membuat/mengubah materi untuk kelas/mapel
 * yang bukan bagian dari TeachingAssignment-nya, walau request dipalsukan
 * langsung ke server action (tanpa lewat dropdown UI).
 *
 * Cara kerja:
 * - Memanggil fungsi ASLI di src/actions/guru/materi.ts (bukan reimplementasi),
 *   dengan DB asli (mongoose).
 * - Hanya 2 hal yang dipalsukan karena butuh konteks request Next.js:
 *     • `next-auth`  → getServerSession() mengembalikan sesi yang kita atur
 *     • `next/cache` → revalidatePath() jadi no-op
 * - Fixture sementara (guru lain, penugasan lain) dibuat lalu SELALU dihapus
 *   di blok finally. Semua materi uji diberi prefix judul unik per-run.
 * - Tidak menyentuh/menghapus data seed. Exit code 1 jika ada tes gagal.
 */

import mongoose from "mongoose";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Module = require("module");

// ── 1. Stub modul yang butuh konteks Next.js (HARUS sebelum import action) ────

type FakeSession = { user: { id: string; role: string; name?: string; email?: string } } | null;
let currentSession: FakeSession = null;

const originalLoad = Module._load;
Module._load = function (request: string, ...rest: unknown[]) {
  if (request === "next-auth") {
    return { getServerSession: async () => currentSession };
  }
  if (request === "next/cache") {
    return { revalidatePath: () => {}, revalidateTag: () => {} };
  }
  if (request === "next/navigation") {
    return {
      redirect: (to: string) => {
        throw new Error(`NEXT_REDIRECT:${to}`);
      },
    };
  }
  return originalLoad.call(this, request, ...rest);
};

// ── 2. Import (setelah stub terpasang) ────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-require-imports */
const { connectDB } = require("../src/lib/mongodb");
const User = require("../src/models/User").default;
const AcademicYear = require("../src/models/AcademicYear").default;
const Subject = require("../src/models/Subject").default;
const ClassModel = require("../src/models/Class").default;
const TeachingAssignment = require("../src/models/TeachingAssignment").default;
const Material = require("../src/models/Material").default;
const actions = require("../src/actions/guru/materi") as typeof import("../src/actions/guru/materi");
/* eslint-enable @typescript-eslint/no-require-imports */

const { createMateri, updateMateri, setMateriStatus, deleteMateri } = actions;

// ── 3. Util tes ───────────────────────────────────────────────────────────────

const RUN_ID = Date.now().toString(36);
const PREFIX = `[AUTHZ-TEST ${RUN_ID}]`;
const NOT_ASSIGNED = /tidak ditugaskan/i;

type Result = { name: string; pass: boolean; detail: string };
const results: Result[] = [];

function record(name: string, pass: boolean, detail: string) {
  results.push({ name, pass, detail });
  console.log(`${pass ? "  ✅ PASS" : "  ❌ FAIL"}  ${name}${pass ? "" : `\n         ↳ ${detail}`}`);
}

const asSession = (id: string, role: string): FakeSession => ({
  user: { id, role, name: role, email: `${role}@test.invalid` },
});

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

function materiForm(title: string, assignmentId: string, extra: Record<string, string> = {}) {
  return form({
    title: `${PREFIX} ${title}`,
    description: "deskripsi uji otorisasi",
    content: "isi materi uji otorisasi",
    assignmentId,
    status: "draft",
    ...extra,
  });
}

const countTestMaterials = (title?: string) =>
  Material.countDocuments({ title: title ? `${PREFIX} ${title}` : { $regex: `^\\[AUTHZ-TEST ${RUN_ID}\\]` } });

const snapshot = async (id: string) => JSON.stringify(await Material.findById(id).lean());

/** Tes bahwa createMateri DITOLAK dengan pesan tertentu & tidak ada dokumen tertulis. */
async function expectCreateRejected(
  name: string,
  session: FakeSession,
  assignmentId: string,
  expected: RegExp,
  extra: Record<string, string> = {},
) {
  currentSession = session;
  const title = `create: ${name}`;
  const before = await countTestMaterials();
  const res = await createMateri({}, materiForm(title, assignmentId, extra));
  const after = await countTestMaterials();
  const msg = res.error ?? JSON.stringify(res.fieldErrors ?? {});
  const pass = !res.success && expected.test(msg) && after === before;
  record(name, pass, `success=${res.success} msg="${msg}" dokumenBaru=${after - before}`);
}

/** Tes bahwa updateMateri DITOLAK dengan pesan tertentu & dokumen TIDAK berubah. */
async function expectUpdateRejected(
  name: string,
  session: FakeSession,
  materialId: string,
  assignmentId: string,
  expected: RegExp,
) {
  currentSession = session;
  const before = await snapshot(materialId);
  const res = await updateMateri(materialId, {}, materiForm("update-hijack", assignmentId));
  const after = await snapshot(materialId);
  const msg = res.error ?? JSON.stringify(res.fieldErrors ?? {});
  const pass = !res.success && expected.test(msg) && before === after;
  record(name, pass, `success=${res.success} msg="${msg}" dokumenBerubah=${before !== after}`);
}

// ── 4. Main ───────────────────────────────────────────────────────────────────

const created = {
  userIds: [] as unknown[],
  assignmentIds: [] as unknown[],
};

async function cleanup() {
  try {
    const m = await Material.deleteMany({ title: { $regex: `^\\[AUTHZ-TEST ${RUN_ID}\\]` } });
    const a = await TeachingAssignment.deleteMany({ _id: { $in: created.assignmentIds } });
    const u = await User.deleteMany({ _id: { $in: created.userIds } });
    console.log(
      `\n🧹 Cleanup: ${m.deletedCount} materi, ${a.deletedCount} penugasan, ${u.deletedCount} user sementara dihapus.`,
    );
  } catch (err) {
    console.error("⚠️  Cleanup GAGAL — hapus manual fixture berikut:", created, err);
  }
}

async function main() {
  const conn = await connectDB();
  console.log(`🔌 Terhubung ke host: ${conn.connection.host} (db: ${conn.connection.name})`);
  console.log(`🏷️  Run ID: ${RUN_ID}  (prefix materi: ${PREFIX})\n`);

  // ── Fixture: baca data seed ──────────────────────────────────────────────
  const budi = await User.findOne({ email: "guru@sekolah.sch.id", role: "teacher" }).lean();
  const activeYear = await AcademicYear.findOne({ isActive: true }).lean();
  const inactiveYear = await AcademicYear.findOne({ isActive: false }).lean();
  if (!budi || !activeYear || !inactiveYear) {
    throw new Error("Data seed tidak lengkap (guru Budi / tahun ajaran aktif+nonaktif). Jalankan `npm run seed`.");
  }

  const budiAssignments = await TeachingAssignment.find({
    teacher: budi._id,
    academicYear: activeYear._id,
  }).lean();
  if (budiAssignments.length === 0) throw new Error("Budi tidak punya penugasan di tahun ajaran aktif.");

  const ownClassIds = new Set(budiAssignments.map((a: { class: unknown }) => String(a.class)));
  const ownSubjectIds = new Set(budiAssignments.map((a: { subject: unknown }) => String(a.subject)));
  const own = budiAssignments[0];

  const foreignClass = (await ClassModel.find({ academicYear: activeYear._id }).lean()).find(
    (c: { _id: unknown }) => !ownClassIds.has(String(c._id)),
  );
  const foreignSubject = (await Subject.find({}).lean()).find(
    (s: { _id: unknown }) => !ownSubjectIds.has(String(s._id)),
  );
  if (!foreignClass || !foreignSubject) throw new Error("Tidak ada kelas/mapel 'asing' untuk diuji.");

  // Scope nyata Budi (dicetak agar jelas data apa yang dipakai tes)
  const classNameById = new Map((await ClassModel.find({}).lean()).map((c: { _id: unknown; name: string }) => [String(c._id), c.name]));
  const subjectNameById = new Map((await Subject.find({}).lean()).map((s: { _id: unknown; name: string }) => [String(s._id), s.name]));
  console.log("📋 Scope Budi (tahun ajaran aktif):");
  for (const a of budiAssignments as Array<{ subject: unknown; class: unknown }>) {
    console.log(`   • ${subjectNameById.get(String(a.subject))} — ${classNameById.get(String(a.class))}`);
  }
  console.log("");

  // Fixture nama untuk skenario 2a/2b
  const inggris = await Subject.findOne({ name: "Bahasa Inggris" }).lean();
  const xiTjkt1 = await ClassModel.findOne({ name: "XI TJKT 1", academicYear: activeYear._id }).lean();
  const outOfScopeClass = foreignClass;
  if (!inggris || !xiTjkt1 || !outOfScopeClass) {
    throw new Error("Mapel 'Bahasa Inggris' / kelas 'XI TJKT 1' / kelas luar scope tidak ada di DB.");
  }
  const budiInggris = (budiAssignments as Array<{ _id: unknown; subject: unknown; class: unknown }>).find(
    (a) => String(a.subject) === String(inggris._id),
  );
  const budiTjkt = (budiAssignments as Array<{ _id: unknown; subject: unknown; class: unknown }>).find(
    (a) => String(a.class) === String(xiTjkt1._id),
  );
  const crossPairExists = (budiAssignments as Array<{ subject: unknown; class: unknown }>).some(
    (a) => String(a.subject) === String(inggris._id) && String(a.class) === String(xiTjkt1._id),
  );
  const outOfScopeClassInScope = ownClassIds.has(String(outOfScopeClass._id));

  // ── Fixture sementara: guru lain + penugasan yang BUKAN milik Budi ──────
  const other = await User.create({
    username: `authz-test-teacher-${RUN_ID}`,
    email: `authz-test-${RUN_ID}@test.invalid`,
    password: "not-a-real-hash",
    role: "teacher",
  });
  created.userIds.push(other._id);

  const mk = async (teacher: unknown, subject: unknown, klass: unknown, year: unknown) => {
    const doc = await TeachingAssignment.create({ teacher, subject, class: klass, academicYear: year });
    created.assignmentIds.push(doc._id);
    return String(doc._id);
  };

  // F1: guru lain, KELAS ASING (+ mapel milik Budi)
  const F1 = await mk(other._id, own.subject, foreignClass._id, activeYear._id);
  // F2: guru lain, kelas MILIK Budi tapi MAPEL asing (campuran)
  const F2 = await mk(other._id, foreignSubject._id, own.class, activeYear._id);
  // F3: penugasan milik Budi sendiri, tapi di TAHUN AJARAN NONAKTIF
  const F3 = await mk(budi._id, foreignSubject._id, foreignClass._id, inactiveYear._id);
  // F4: guru lain ditugaskan pasangan (Bahasa Inggris × XI TJKT 1) — pasangan yang TIDAK pernah ditugaskan ke Budi
  const F4 = await mk(other._id, inggris._id, xiTjkt1._id, activeYear._id);
  // F5: guru lain ditugaskan (Bahasa Inggris × kelas di luar scope Budi)
  const F5 = await mk(other._id, inggris._id, outOfScopeClass._id, activeYear._id);
  // F6: pasangan mapel×kelas yang IDENTIK dengan penugasan sah Budi, tapi di tahun ajaran NONAKTIF
  const F6 = await mk(budi._id, own.subject, own.class, inactiveYear._id);
  const OWN = String(own._id);
  const GHOST = new mongoose.Types.ObjectId().toString(); // format valid, tidak ada di DB

  const BUDI = String(budi._id);
  const OTHER = String(other._id);
  const asBudi = asSession(BUDI, "teacher");
  const asOther = asSession(OTHER, "teacher");

  // ── A. Kontrol positif (membuktikan harness tidak rusak) ────────────────
  console.log("A. Kontrol positif (harus BERHASIL, agar penolakan di bawah bermakna)");
  currentSession = asBudi;
  const ctrl = await createMateri({}, materiForm("kontrol-sah", OWN));
  const ctrlDoc = await Material.findOne({ title: `${PREFIX} kontrol-sah` }).lean();
  record(
    "Budi membuat materi di penugasannya sendiri → BERHASIL",
    !!ctrl.success && !!ctrlDoc,
    `success=${ctrl.success} error=${ctrl.error}`,
  );
  if (!ctrlDoc) throw new Error("Kontrol positif gagal — harness/DB bermasalah, tes dihentikan.");
  const M = String(ctrlDoc._id);

  // ── B. createMateri: penugasan palsu/asing ──────────────────────────────
  console.log("\nB. createMateri — request dipalsukan");
  await expectCreateRejected("assignmentId milik GURU LAIN di KELAS ASING → ditolak", asBudi, F1, NOT_ASSIGNED);
  await expectCreateRejected("assignmentId guru lain (kelas Budi, mapel asing) → ditolak", asBudi, F2, NOT_ASSIGNED);
  await expectCreateRejected("assignmentId Budi tapi TAHUN AJARAN NONAKTIF → ditolak", asBudi, F3, NOT_ASSIGNED);
  await expectCreateRejected("assignmentId tidak ada di DB (ObjectId valid) → ditolak", asBudi, GHOST, NOT_ASSIGNED);
  await expectCreateRejected("assignmentId format ngawur → ditolak validasi", asBudi, "bukan-objectid", /Pilih mapel/);
  await expectCreateRejected("assignmentId berisi operator NoSQL → ditolak", asBudi, '{"$ne":null}', /Pilih mapel/);

  // ── C. Parameter tampering: classId/subjectId palsu disisipkan ──────────
  console.log("\nC. Parameter tampering — classId/subjectId/teacher/academicYear palsu disisipkan");
  currentSession = asBudi;
  const tamper = await createMateri(
    {},
    materiForm("tamper", OWN, {
      classId: String(foreignClass._id),
      subjectId: String(foreignSubject._id),
      class: String(foreignClass._id),
      subject: String(foreignSubject._id),
      teacher: OTHER,
      academicYear: String(inactiveYear._id),
    }),
  );
  const tDoc = await Material.findOne({ title: `${PREFIX} tamper` }).lean();
  record(
    "Field class/subject/teacher/academicYear palsu DIABAIKAN (nilai dari server)",
    !!tDoc &&
      String(tDoc.class) === String(own.class) &&
      String(tDoc.subject) === String(own.subject) &&
      String(tDoc.teacher) === BUDI &&
      String(tDoc.academicYear) === String(activeYear._id),
    `success=${tamper.success} doc=${JSON.stringify(tDoc && { class: tDoc.class, subject: tDoc.subject, teacher: tDoc.teacher })}`,
  );

  // ── D. Sesi tidak sah ────────────────────────────────────────────────────
  console.log("\nD. Sesi tidak sah (walau assignmentId SAH milik Budi)");
  const NOT_TEACHER = /sesi tidak valid/i;
  await expectCreateRejected("tanpa login → ditolak", null, OWN, NOT_TEACHER);
  await expectCreateRejected("login sebagai siswa → ditolak", asSession(BUDI, "student"), OWN, NOT_TEACHER);
  await expectCreateRejected("login sebagai admin → ditolak", asSession(BUDI, "admin"), OWN, NOT_TEACHER);
  for (const [label, sess] of [
    ["tanpa login", null],
    ["login sebagai siswa", asSession(BUDI, "student")],
  ] as Array<[string, FakeSession]>) {
    await expectUpdateRejected(`updateMateri ${label} → ditolak`, sess, M, OWN, NOT_TEACHER);
    currentSession = sess;
    const snapBefore = await snapshot(M);
    const s1 = await setMateriStatus(M, "published");
    record(
      `setMateriStatus ${label} → ditolak & tidak berubah`,
      !s1.success && NOT_TEACHER.test(s1.error ?? "") && snapBefore === (await snapshot(M)),
      `success=${s1.success} error=${s1.error}`,
    );
    const d1 = await deleteMateri(M);
    record(
      `deleteMateri ${label} → ditolak & materi masih ada`,
      !d1.success && NOT_TEACHER.test(d1.error ?? "") && !!(await Material.findById(M).lean()),
      `success=${d1.success} error=${d1.error}`,
    );
  }

  // ── E. updateMateri: pindahkan materi Budi ke penugasan asing ───────────
  console.log("\nE. updateMateri — membajak materi ke penugasan asing");
  await expectUpdateRejected("Budi update materinya → penugasan guru lain/kelas asing (F1) → ditolak", asBudi, M, F1, NOT_ASSIGNED);
  await expectUpdateRejected("Budi update materinya → kelas Budi + mapel asing (F2) → ditolak", asBudi, M, F2, NOT_ASSIGNED);
  await expectUpdateRejected("Budi update materinya → tahun ajaran nonaktif (F3) → ditolak", asBudi, M, F3, NOT_ASSIGNED);
  await expectUpdateRejected("Budi update materinya → assignmentId hantu → ditolak", asBudi, M, GHOST, NOT_ASSIGNED);
  await expectUpdateRejected("(2d) Budi update materinya → pasangan SAMA dgn penugasan sahnya tapi tahun ajaran NONAKTIF (F6) → ditolak", asBudi, M, F6, NOT_ASSIGNED);
  await expectUpdateRejected("(2c) Budi memindahkan kelas materinya ke XI TJKT 1 + mapel Inggris (pasangan tak ditugaskan, F4) → ditolak", asBudi, M, F4, NOT_ASSIGNED);
  await expectUpdateRejected(`(2c) Budi memindahkan kelas materinya ke ${outOfScopeClass.name} (di luar scope, F5) → ditolak`, asBudi, M, F5, NOT_ASSIGNED);

  // ── H. Skenario 2a/2b/2d pada create ────────────────────────────────────
  console.log("\nH. createMateri — pasangan tak ditugaskan / di luar scope / tahun nonaktif");
  record(
    "Prasyarat 2a: Bahasa Inggris & XI TJKT 1 masing-masing ADA di scope Budi, tapi pasangannya TIDAK ditugaskan",
    !!budiInggris && !!budiTjkt && !crossPairExists,
    `inggrisDiScope=${!!budiInggris} tjkt1DiScope=${!!budiTjkt} pasanganDitugaskan=${crossPairExists}`,
  );
  record(
    `Prasyarat 2b: ${outOfScopeClass.name} sama sekali di luar scope Budi`,
    !outOfScopeClassInScope,
    `classDiScope=${outOfScopeClassInScope}`,
  );
  await expectCreateRejected("(2a) create Bahasa Inggris × XI TJKT 1 (penugasan guru lain, F4) → ditolak", asBudi, F4, NOT_ASSIGNED);
  await expectCreateRejected(`(2b) create kelas ${outOfScopeClass.name} di luar scope (F5) → ditolak`, asBudi, F5, NOT_ASSIGNED);
  await expectCreateRejected("(2d) create pasangan sah tapi tahun ajaran NONAKTIF (F6) → ditolak", asBudi, F6, NOT_ASSIGNED);

  if (budiInggris && budiTjkt) {
    // Pasangan silang lewat tampering: pakai penugasan Inggris (kelas lain) + paksa classId=XI TJKT 1
    currentSession = asBudi;
    await createMateri(
      {},
      materiForm("cross-class", String(budiInggris._id), {
        classId: String(xiTjkt1._id),
        class: String(xiTjkt1._id),
      }),
    );
    const d1 = await Material.findOne({ title: `${PREFIX} cross-class` }).lean();
    record(
      "(2a) penugasan Inggris + classId=XI TJKT 1 dipaksa → kelas tetap dari penugasan, BUKAN XI TJKT 1",
      !!d1 && String(d1.class) === String(budiInggris.class) && String(d1.class) !== String(xiTjkt1._id),
      `class=${d1?.class}`,
    );
    // Kebalikannya: penugasan XI TJKT 1 + paksa subjectId=Bahasa Inggris
    await createMateri(
      {},
      materiForm("cross-subject", String(budiTjkt._id), {
        subjectId: String(inggris._id),
        subject: String(inggris._id),
      }),
    );
    const d2 = await Material.findOne({ title: `${PREFIX} cross-subject` }).lean();
    record(
      "(2a) penugasan XI TJKT 1 + subjectId=Bahasa Inggris dipaksa → mapel tetap dari penugasan",
      !!d2 && String(d2.subject) === String(budiTjkt.subject) && String(d2.subject) !== String(inggris._id),
      `subject=${d2?.subject}`,
    );
    // Update dengan tampering classId → kelas materi tidak boleh berubah
    const beforeClass = String((await Material.findById(M).lean())?.class);
    const upT = new FormData();
    for (const [k, v] of Object.entries({
      title: `${PREFIX} update-tamper`, description: "deskripsi uji", content: "isi uji", assignmentId: OWN, status: "draft",
      classId: String(outOfScopeClass._id), class: String(outOfScopeClass._id),
    })) upT.set(k, v);
    await updateMateri(M, {}, upT);
    const afterClass = String((await Material.findById(M).lean())?.class);
    record(
      `(2c) update dgn classId=${outOfScopeClass.name} dipaksa → kelas materi tidak pindah`,
      afterClass === beforeClass && afterClass !== String(outOfScopeClass._id),
      `before=${beforeClass} after=${afterClass}`,
    );
  }

  // ── F. IDOR: guru lain menyentuh materi milik Budi ──────────────────────
  console.log("\nF. IDOR — guru LAIN (punya penugasan sah F1) menyentuh materi milik Budi");
  await expectUpdateRejected("Guru lain update materi Budi (pakai penugasannya sendiri) → ditolak", asOther, M, F1, /tidak ditemukan/i);

  let before = await snapshot(M);
  currentSession = asOther;
  const st = await setMateriStatus(M, "published");
  record(
    "Guru lain setMateriStatus materi Budi → ditolak & tidak berubah",
    !st.success && /tidak ditemukan/i.test(st.error ?? "") && before === (await snapshot(M)),
    `success=${st.success} error=${st.error}`,
  );

  currentSession = asOther;
  const del = await deleteMateri(M);
  record(
    "Guru lain deleteMateri materi Budi → ditolak & materi masih ada",
    !del.success && /tidak ditemukan/i.test(del.error ?? "") && !!(await Material.findById(M).lean()),
    `success=${del.success} error=${del.error}`,
  );

  // ── I. (2f) Guru B SUNGGUHAN (dibuat admin lewat UI) ─────────────────────
  console.log("\nI. (2f) Guru B sungguhan — update/delete/setStatus materi milik guru A (dan sebaliknya)");
  const realOthers = await User.find({
    role: "teacher",
    _id: { $ne: budi._id },
    email: { $not: /@test\.invalid$/ },
    isActive: { $ne: false },
  }).lean();
  let guruB: { _id: unknown; username: string } | undefined;
  let guruBAssign: { _id: unknown; class: unknown } | undefined;
  for (const t of realOthers as Array<{ _id: unknown; username: string }>) {
    const list = await TeachingAssignment.find({ teacher: t._id, academicYear: activeYear._id }).lean();
    if (list.length === 0) continue;
    // Utamakan penugasan di kelas yang SAMA dengan Budi (skenario paling ketat)
    const sameClass = list.find((x: { class: unknown }) => ownClassIds.has(String(x.class)));
    guruB = t;
    guruBAssign = sameClass ?? list[0];
    break;
  }
  if (!guruB || !guruBAssign) {
    console.log("  ⏭️  DILEWATI: belum ada guru kedua sungguhan (bukan fixture) dengan penugasan di tahun ajaran aktif.");
    console.log("      Buat guru B lewat /admin/guru, tugaskan lewat /admin/penugasan, lalu jalankan ulang tes ini.");
  } else {
    const GB = String(guruB._id);
    const GBA = String(guruBAssign._id);
    const asB = asSession(GB, "teacher");
    console.log(`  (guru B = ${guruB.username}; kelas sama dgn Budi: ${ownClassIds.has(String(guruBAssign.class))})`);

    // B tidak bisa menyentuh materi Budi (M)
    await expectUpdateRejected("Guru B update materi Budi (pakai penugasannya sendiri) → ditolak", asB, M, GBA, /tidak ditemukan/i);
    let snapB = await snapshot(M);
    currentSession = asB;
    const bSt = await setMateriStatus(M, "published");
    record("Guru B setMateriStatus materi Budi → ditolak & tidak berubah", !bSt.success && /tidak ditemukan/i.test(bSt.error ?? "") && snapB === (await snapshot(M)), `success=${bSt.success} error=${bSt.error}`);
    currentSession = asB;
    const bDel = await deleteMateri(M);
    record("Guru B deleteMateri materi Budi → ditolak & materi masih ada", !bDel.success && /tidak ditemukan/i.test(bDel.error ?? "") && !!(await Material.findById(M).lean()), `success=${bDel.success} error=${bDel.error}`);

    // Kontrol positif guru B + arah sebaliknya (Budi tidak bisa menyentuh materi B)
    currentSession = asB;
    await createMateri({}, materiForm("materi-guru-b", GBA));
    const bDoc = await Material.findOne({ title: `${PREFIX} materi-guru-b` }).lean();
    record("Kontrol positif: guru B membuat materi di penugasannya sendiri → BERHASIL", !!bDoc, `doc=${!!bDoc}`);
    if (bDoc) {
      const BM = String(bDoc._id);
      await expectUpdateRejected("Budi update materi guru B → ditolak", asBudi, BM, OWN, /tidak ditemukan/i);
      snapB = await snapshot(BM);
      currentSession = asBudi;
      const aSt = await setMateriStatus(BM, "published");
      record("Budi setMateriStatus materi guru B → ditolak & tidak berubah", !aSt.success && snapB === (await snapshot(BM)), `success=${aSt.success} error=${aSt.error}`);
      currentSession = asBudi;
      const aDel = await deleteMateri(BM);
      record("Budi deleteMateri materi guru B → ditolak & materi masih ada", !aDel.success && !!(await Material.findById(BM).lean()), `success=${aDel.success} error=${aDel.error}`);
    }
  }

  // ── G. Kontrol positif akhir ─────────────────────────────────────────────
  console.log("\nG. Kontrol positif akhir (pemilik sah masih bisa mengelola)");
  before = await snapshot(M);
  currentSession = asBudi;
  const up = await updateMateri(M, {}, materiForm("update-sah", OWN));
  const upDoc = await Material.findById(M).lean();
  record(
    "Budi update materinya sendiri di penugasannya → BERHASIL",
    !!up.success && upDoc?.title === `${PREFIX} update-sah`,
    `success=${up.success} error=${up.error}`,
  );
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
    console.log("❌ ADA CELAH OTORISASI / TES GAGAL:");
    for (const f of failed) console.log(`   - ${f.name}\n       ${f.detail}`);
    process.exit(1);
  }
  console.log("✅ Semua skenario gagal-yang-diharapkan DITOLAK dengan benar.");
}

run();
