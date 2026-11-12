import type {
  AdminStats,
  Guru,
  Jurusan,
  Kelas,
  Siswa,
  TahunAjaran,
} from "@/types/admin";

export const jurusanList: Jurusan[] = [
  {
    id: "jur-1",
    nama: "Pengembangan Perangkat Lunak dan Gim",
    slug: "pplg",
    singkatan: "PPLG",
  },
  {
    id: "jur-2",
    nama: "Teknik Jaringan Komputer dan Telekomunikasi",
    slug: "tjkt",
    singkatan: "TJKT",
  },
  {
    id: "jur-3",
    nama: "Desain Komunikasi Visual",
    slug: "dkv",
    singkatan: "DKV",
  },
];

export const kelasList: Kelas[] = [
  {
    id: "kls-1",
    nama: "X PPLG 1",
    jurusanId: "jur-1",
    jurusanSlug: "pplg",
    tingkat: "X",
    jumlahSiswa: 32,
    waliKelas: "Rina Putri, S.Kom.",
  },
  {
    id: "kls-2",
    nama: "X PPLG 2",
    jurusanId: "jur-1",
    jurusanSlug: "pplg",
    tingkat: "X",
    jumlahSiswa: 30,
    waliKelas: "Budi Santoso, S.Pd.",
  },
  {
    id: "kls-3",
    nama: "XI PPLG 1",
    jurusanId: "jur-1",
    jurusanSlug: "pplg",
    tingkat: "XI",
    jumlahSiswa: 28,
    waliKelas: "Sari Dewi, M.Kom.",
  },
  {
    id: "kls-4",
    nama: "XII PPLG 1",
    jurusanId: "jur-1",
    jurusanSlug: "pplg",
    tingkat: "XII",
    jumlahSiswa: 26,
    waliKelas: "Andi Wijaya, S.Kom.",
  },
  {
    id: "kls-5",
    nama: "X TJKT 1",
    jurusanId: "jur-2",
    jurusanSlug: "tjkt",
    tingkat: "X",
    jumlahSiswa: 31,
    waliKelas: "Dedi Kurnia, S.T.",
  },
  {
    id: "kls-6",
    nama: "XI TJKT 1",
    jurusanId: "jur-2",
    jurusanSlug: "tjkt",
    tingkat: "XI",
    jumlahSiswa: 29,
    waliKelas: "Lina Maharani, S.Pd.",
  },
  {
    id: "kls-7",
    nama: "X DKV 1",
    jurusanId: "jur-3",
    jurusanSlug: "dkv",
    tingkat: "X",
    jumlahSiswa: 27,
    waliKelas: "Maya Kusuma, S.Ds.",
  },
  {
    id: "kls-8",
    nama: "XI DKV 1",
    jurusanId: "jur-3",
    jurusanSlug: "dkv",
    tingkat: "XI",
    jumlahSiswa: 25,
    waliKelas: "Fajar Pratama, S.Sn.",
  },
];

export const tahunAjaranList: TahunAjaran[] = [
  { id: "ta-1", tahun: "2025/2026", aktif: true },
  { id: "ta-2", tahun: "2024/2025", aktif: false },
  { id: "ta-3", tahun: "2023/2024", aktif: false },
];

export const siswaList: Siswa[] = [
  {
    id: "sis-1",
    nama: "Ahmad Fauzi",
    nis: "2025001",
    kelas: "X PPLG 1",
    jurusan: "PPLG",
  },
  {
    id: "sis-2",
    nama: "Nadia Rahma",
    nis: "2025002",
    kelas: "X PPLG 1",
    jurusan: "PPLG",
  },
  {
    id: "sis-3",
    nama: "Reza Pratama",
    nis: "2024108",
    kelas: "XI TJKT 1",
    jurusan: "TJKT",
  },
  {
    id: "sis-4",
    nama: "Intan Salsabila",
    nis: "2024203",
    kelas: "XI DKV 1",
    jurusan: "DKV",
  },
  {
    id: "sis-5",
    nama: "Yoga Nugraha",
    nis: "2025014",
    kelas: "X TJKT 1",
    jurusan: "TJKT",
  },
];

export const guruList: Guru[] = [
  {
    id: "gru-1",
    nama: "Rina Putri, S.Kom.",
    nip: "198803122010012001",
    mapel: "Pemrograman Web",
    status: "aktif",
  },
  {
    id: "gru-2",
    nama: "Budi Santoso, S.Pd.",
    nip: "198105152008011003",
    mapel: "Basis Data",
    status: "aktif",
  },
  {
    id: "gru-3",
    nama: "Maya Kusuma, S.Ds.",
    nip: "199204082015032002",
    mapel: "Desain Grafis",
    status: "aktif",
  },
  {
    id: "gru-4",
    nama: "Dedi Kurnia, S.T.",
    nip: "197912102006041002",
    mapel: "Jaringan Komputer",
    status: "nonaktif",
  },
];

export const adminStats: AdminStats = {
  totalSiswa: siswaList.length + 223,
  totalGuru: guruList.filter((guru) => guru.status === "aktif").length + 18,
  totalKelas: kelasList.length,
  totalJurusan: jurusanList.length,
  tahunAjaranAktif:
    tahunAjaranList.find((item) => item.aktif)?.tahun ?? "2025/2026",
};

export function getJurusanBySlug(slug: string) {
  return jurusanList.find((item) => item.slug === slug);
}

export function getKelasByJurusanSlug(slug: string) {
  return kelasList.filter((item) => item.jurusanSlug === slug);
}
