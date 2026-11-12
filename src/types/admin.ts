export type UserRole = "student" | "teacher" | "admin" | "principal";

export type Jurusan = {
  id: string;
  nama: string;
  slug: string;
  singkatan: string;
};

export type Kelas = {
  id: string;
  nama: string;
  jurusanId: string;
  jurusanSlug: string;
  tingkat: "X" | "XI" | "XII";
  jumlahSiswa: number;
  waliKelas: string;
};

export type TahunAjaran = {
  id: string;
  tahun: string;
  aktif: boolean;
};

export type Siswa = {
  id: string;
  nama: string;
  nis: string;
  kelas: string;
  jurusan: string;
};

export type Guru = {
  id: string;
  nama: string;
  nip: string;
  mapel: string;
  status: "aktif" | "nonaktif";
};

export type AdminStats = {
  totalSiswa: number;
  totalGuru: number;
  totalKelas: number;
  totalJurusan: number;
  tahunAjaranAktif: string;
};
