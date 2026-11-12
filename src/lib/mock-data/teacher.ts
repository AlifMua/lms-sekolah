// src/lib/mock-data/teacher.ts
import type { TeacherInfo, GuruMateri, GuruAssessment, GuruProject, GuruNilai } from '@/types/teacher';

export const teacherInfo: TeacherInfo = {
  nama: 'Budi Santoso',
  mapel: 'Matematika',
  kelas: ['X PPLG 1', 'X PPLG 2', 'XI PPLG 1'],
};

export const guruMateriList: GuruMateri[] = [
  {
    id: 'gm-1',
    judul: 'Persamaan Kuadrat',
    mapel: 'Matematika',
    kelas: 'X PPLG 1',
    tanggal: '10 September 2026',
    status: 'Tersedia',
  },
  {
    id: 'gm-2',
    judul: 'Struktur Data Array',
    mapel: 'Pemrograman',
    kelas: 'X PPLG 2',
    tanggal: '12 September 2026',
    status: 'Tersedia',
  },
];

export const guruAssessmentList: GuruAssessment[] = [
  {
    id: 'ga-1',
    judul: 'Assessment Matematika',
    kelas: 'X PPLG 1',
    jumlahSoal: 10,
    deadline: '15 September 2026',
    status: 'Aktif',
  },
];

export const guruProjectList: GuruProject[] = [
  {
    id: 'gp-1',
    judul: 'Project Web Development',
    kelas: 'X PPLG 2',
    deadline: '20 September 2026',
    jumlahSiswa: 30,
    terkumpul: 5,
    status: 'Sedang dikumpulkan',
  },
];

export const guruNilaiList: GuruNilai[] = [
  {
    id: 'gn-1',
    namaSiswa: 'Andi',
    tugas: 'Project Web Development',
    assessment: 'Assessment Matematika',
    nilaiAkhir: 88,
  },
  {
    id: 'gn-2',
    namaSiswa: 'Siti',
    tugas: 'Project Web Development',
    assessment: 'Assessment Matematika',
    nilaiAkhir: 92,
  },
];
