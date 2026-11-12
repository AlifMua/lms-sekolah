// src/types/teacher.ts
export type TeacherInfo = {
  nama: string;
  mapel: string;
  kelas: string[]; // list of class names they teach
};

export type GuruMateri = {
  id: string;
  judul: string;
  mapel: string;
  kelas: string; // class name
  tanggal: string;
  status: string; // e.g., 'Tersedia'
};

export type GuruAssessment = {
  id: string;
  judul: string;
  kelas: string;
  jumlahSoal: number;
  deadline: string;
  status: string; // e.g., 'Aktif'
};

export type GuruProject = {
  id: string;
  judul: string;
  kelas: string;
  deadline: string;
  jumlahSiswa: number;
  terkumpul: number;
  status: string; // e.g., 'Sedang dikumpulkan'
};

export type GuruNilai = {
  id: string;
  namaSiswa: string;
  tugas: string;
  assessment: string;
  nilaiAkhir: number;
};
