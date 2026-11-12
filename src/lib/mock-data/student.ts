// src/lib/mock-data/student.ts
import type { StudentInfo, Materi, Assessment, Project, Nilai } from '@/types/student';

export const studentInfo: StudentInfo = {
  nama: 'Alif Maulana',
  kelas: 'XI PPLG 1',
  jurusan: 'PPLG',
  waliKelas: 'Budi Santoso',
};

export const materiList: Materi[] = [
  {
    id: 'materi-1',
    judul: 'Persamaan Kuadrat',
    mapel: 'Matematika',
    guru: 'Pak Budi',
    tanggal: '10 September 2026',
    status: 'Tersedia',
  },
  {
    id: 'materi-2',
    judul: 'Struktur Data Array',
    mapel: 'Pemrograman',
    guru: 'Ibu Siti',
    tanggal: '12 September 2026',
    status: 'Tersedia',
  },
];

export const assessmentList: Assessment[] = [
  {
    id: 'assess-1',
    judul: 'Assessment Matematika',
    mapel: 'Matematika',
    guru: 'Pak Budi',
    jumlahSoal: 10,
    deadline: '15 September 2026',
    status: 'Belum dikerjakan',
  },
];

export const projectList: Project[] = [
  {
    id: 'proj-1',
    judul: 'Project Web Development',
    mapel: 'Pemrograman',
    guru: 'Ibu Siti',
    deadline: '20 September 2026',
    status: 'Belum dikumpulkan',
  },
];

export const nilaiList: Nilai[] = [
  {
    id: 'nilai-1',
    mapel: 'Matematika',
    tipe: 'Assessment',
    judul: 'Assessment Matematika',
    nilai: 85,
    guru: 'Pak Budi',
  },
  {
    id: 'nilai-2',
    mapel: 'Pemrograman',
    tipe: 'Project',
    judul: 'Project Web Development',
    nilai: 90,
    guru: 'Ibu Siti',
  },
];
