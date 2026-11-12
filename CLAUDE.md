<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data.
Read the relevant guide in node_modules/next/dist/docs/ before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# LMS Sekolah — Claude Developer Guide & Execution Blueprint

Panduan ini ditujukan untuk **Claude** agar dapat melanjutkan dan menyelesaikan pengembangan project **LMS Sekolah** sampai tuntas dengan arsitektur yang konsisten, aman, dan tanpa error.

---

## 1. Environment & Tech Stack

- **Framework**: Next.js 16.3.4 (App Router, Turbopack default)
- **Runtime / Language**: React 19, TypeScript 5, Node.js
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`), Lucide React icons
- **Database**: MongoDB Atlas via Mongoose 9.x (Connection string di `.env.local` -> `MONGODB_URI`, dbName: `lms-sekolah`)
- **Authentication**: NextAuth.js 4.x (JWT strategy, CredentialsProvider, password hashing dengan `bcryptjs`)
- **Utilities**: `zod` untuk validasi form/actions, `xlsx` untuk import/export Excel, `recharts` untuk diagram/grafik statistik.

---

## 2. Breaking Changes & Konvensi Wajib Next.js 16

1. **`proxy.ts` (Bukan `middleware.ts`)**:
   - Di Next.js 16, konvensi request middleware telah bermigrasi dan dinamai `src/proxy.ts`.
   - **JANGAN PERNAH** me-rename `src/proxy.ts` menjadi `middleware.ts`. File ini bertugas melakukan auth check dan role routing guard di Edge runtime.
2. **Dynamic Route Params adalah Promise**:
   - Di Next.js 16, `params` pada Server Component dan Route Handlers berbentuk `Promise`:
     ```tsx
     export default async function DetailPage({ params }: { params: Promise<{ id: string }> }) {
       const { id } = await params;
       // ...
     }
     ```
3. **Server Actions Pattern**:
   - Semua mutasi data menggunakan Next.js Server Actions di `src/actions/` dengan direktif `"use server"`.
   - Setiap action mengembalikan pola konsisten:
     `{ success: boolean, error?: string, fieldErrors?: Record<string, string>, data?: any }`
4. **Mongoose Model Registration**:
   - Karena Next.js menggunakan HMR dan multi-worker compilation, registrasi model harus menggunakan pola:
     ```ts
     const Model = mongoose.models.ModelName || mongoose.model<IModel>("ModelName", schema);
     export default Model;
     ```
   - Sebelum memanggil `.populate("field")`, pastikan model yang direferensikan sudah di-import di file tersebut.

---

## 3. Struktur Role & Akses

| Role | Prefix URL | Dashboard | Hak Akses Utama |
|---|---|---|---|
| `admin` | `/admin` | `/admin` | Kelola Guru, Siswa, Kelas, Jurusan, Mapel, Penugasan Mengajar, Tahun Ajaran, Pengaturan |
| `teacher` | `/guru` | `/guru` | Kelola Materi, Assessment (CBT & Esai), Project/Tugas, Penilaian Siswa, Wali Kelas |
| `student` | `/siswa` | `/siswa` | Akses Materi kelasnya, Kerjakan CBT (Timer & Auto-grade), Kumpul Project, Lihat Nilai & Riwayat |
| `principal` | `/kepsek` | `/kepsek` | Monitoring eksekutif (Statistik sekolah, rekap nilai kelas, audit penugasan & materi) |

---

## 4. Status Proyek Saat Ini

### ✅ Sudah Selesai & Teruji (100% Pass)
1. **Autentikasi & Authorization Guard**:
   - Login multi-role di `/login`, Logout di `/logout`.
   - Guard Edge runtime di `src/proxy.ts` memastikan redirect otomatis sesuai role.
   - User nonaktif otomatis diblokir saat login dan token invalidasi.
2. **Modul Admin**:
   - Master Guru (CRUD, validasi NIP unik, aktivasi/nonaktivasi akun).
   - Master Siswa (CRUD, Import data massal via file Excel `.xlsx`).
   - Master Jurusan, Kelas, Mata Pelajaran, Tahun Ajaran (toggle tahun ajaran aktif).
   - Penugasan Mengajar Guru ke Kelas & Mapel pada tahun ajaran aktif.
3. **Modul Guru**:
   - Materi Pembelajaran (CRUD, publish/draft, scoped ke kelas & mapel penugasan).
   - Assessment CBT (Quiz/UTS/UAS/Tugas): Multiple choice (koreksi otomatis) & Esai (koreksi manual oleh guru), anti-tampering, attempt monitoring.
   - Project / Tugas (CRUD, deadline, monitoring pengumpulan siswa, penilaian & feedback, minta revisi).
   - Buku Nilai Guru (`/guru/nilai`): Rata-rata assessment, project, dan kalkulasi nilai akhir per siswa per kelas.
4. **Modul Siswa**:
   - Siswa Dashboard dengan info kelas, jurusan, wali kelas, tahun ajaran aktif.
   - Siswa Materi: Hanya melihat materi published kelasnya pada tahun ajaran aktif.
   - Siswa CBT (`TakeAssessmentClient`): Tampilan tes interaktif, navigasi nomor soal, countdown timer, auto-submit saat waktu habis.
   - Siswa Project: Upload/submit link & teks, status on-time/late, resubmit bila diminta revisi.
   - Siswa Nilai & Riwayat: Rekap rapor nilai per mapel dan riwayat pengerjaan tugas/tes lampau.
5. **Quality Assurance**:
   - `npm run build` sukses 100% tanpa error.
   - `npm run lint` bersih tanpa error.
   - Semua test suite DB asli di `scripts/test-*.ts` lulus 100% (materi-authz, guru-crud, siswa-materi, siswa-project, penugasan-data).

---

## 5. Roadmap Penyelesaian (Tugas untuk Claude)

Selesaikan fitur-fitur berikut secara bertahap:

### Tahap 1: Pengaturan Sistem & Profil Pengguna (`/admin/pengaturan` dan user profile)
- Ganti implementasi placeholder di `src/app/admin/pengaturan/page.tsx`.
- Buat tab/bagian:
  1. **Profil Pengguna**: Ubah nama, email, dan form Ganti Password (verifikasi password lama, hash password baru dengan bcrypt).
  2. **Profil Sekolah**: Nama sekolah, NPSN, alamat, kontak, email resmi (simpan di database atau model `SchoolSetting`).
  3. **Pengaturan Tahun Ajaran & Status Sistem**: Ringkasan data database dan status semester.
- Buat Server Action di `src/actions/admin/pengaturan.ts` dan action ganti password untuk semua user di `src/actions/auth.ts`.

### Tahap 2: Modul Kepala Sekolah (`/kepsek`)
- Model `User.ts` dan `src/proxy.ts` sudah siap dengan role `principal` -> route `/kepsek`.
- Buat route folder `src/app/kepsek/` dengan:
  - `layout.tsx`: Shell dan sidebar khusus Kepala Sekolah (Dashboard, Rekap Nilai, Guru & Mengajar, Siswa, Laporan).
  - `page.tsx`: Dashboard eksekutif dengan statistik grafik (menggunakan `recharts`):
    - Total siswa aktif, guru aktif, kelas, tingkat kelulusan/rata-rata nilai per jurusan.
    - Status ketercapaian materi guru (berapa materi dibuat/diterbitkan per mapel).
  - `/kepsek/nilai/page.tsx`: Monitoring rekap nilai per kelas dan jurusan (read-only gradebook).
  - `/kepsek/guru/page.tsx`: Monitoring beban mengajar guru (daftar penugasan guru per kelas).
- Tambahkan user Kepala Sekolah pada `scripts/seed.ts` (misal: `kepsek@sekolah.sch.id` / `kepsek123`).

### Tahap 3: Fitur Pengumuman / Broadcast Sekolah (`Announcement`)
- Buat model `src/models/Announcement.ts`:
  - `title`, `content`, `author` (User ref), `targetRole` ("all" | "teacher" | "student"), `pinned` (boolean), `createdAt`.
- Server actions di `src/actions/admin/announcement.ts` untuk Admin membuat pengumuman.
- Tampilkan card widget Pengumuman di dashboard Admin, Guru, dan Siswa.

### Tahap 4: Export Rekap Nilai ke Excel (`.xlsx`)
- Manfaatkan library `xlsx` yang sudah terpasang di dependencies.
- Di halaman `/guru/nilai` dan `/kepsek/nilai`, tambahkan tombol **"Export Excel"**:
  - Download file spreadsheet berisi kolom: NIS, Nama Siswa, Nilai Assessment, Nilai Project, Nilai Akhir, Keterangan (Tuntas/Belum Tuntas sesuai KKM).

### Tahap 5: Media / File Upload Support
- Saat ini lampiran materi dan project menggunakan link URL teks.
- Tambahkan API Route di `src/app/api/upload/route.ts` atau Server Action untuk menerima FormData file (misal PDF / DOCX / gambar max 10MB), menyimpan ke `public/uploads/` atau cloud storage, dan mengembalikan URL file statis.

---

## 6. Perintah Verifikasi & Testing

Sebelum menganggap pekerjaan selesai, selalu jalankan:

```bash
# 1. Jalankan linting (wajib 0 error)
npm run lint

# 2. Jalankan build produksi Turbopack (wajib exit code 0)
npm run build

# 3. Jalankan test otorisasi dan integritas database
npm run test:penugasan-data
npm run test:guru-crud
npm run test:materi-authz
npm run test:siswa-materi
npm run test:siswa-project
```

Jika ada penambahan seed data baru (misal role kepsek atau pengaturan sekolah), update juga file `scripts/seed.ts` dan uji dengan `npm run seed`.
