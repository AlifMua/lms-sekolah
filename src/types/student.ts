export type StudentInfo = {
  nama: string;
  kelas: string;
  jurusan: string;
  waliKelas: string;
};

export type Materi = {
  id: string;
  judul: string;
  mapel: string;
  guru: string;
  tanggal: string;
  status: string; // e.g., 'Tersedia'
};

export type Assessment = {
  id: string;
  judul: string;
  mapel: string;
  guru: string;
  jumlahSoal: number;
  deadline: string;
  status: string; // e.g., 'Belum dikerjakan'
};

export type Project = {
  id: string;
  judul: string;
  mapel: string;
  guru: string;
  deadline: string;
  status: string; // e.g., 'Belum dikumpulkan'
};

export type Nilai = {
  id: string;
  mapel: string;
  tipe: "Assessment" | "Project";
  judul: string;
  nilai: number;
  guru: string;
};
