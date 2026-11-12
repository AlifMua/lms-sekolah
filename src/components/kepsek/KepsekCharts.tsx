"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card } from "@/components/ui/Card";
import type { JurusanStat } from "@/lib/kepsek";

type Props = {
  jurusanStats: JurusanStat[];
};

const COLORS = ["#FF8833", "#f97316", "#fb923c", "#fdba74", "#fed7aa"];

export function KepsekCharts({ jurusanStats }: Props) {
  const siswaData = jurusanStats.map((j) => ({
    name: j.abbreviation,
    value: j.totalSiswa,
  }));

  const nilaiData = jurusanStats
    .filter((j) => j.avgFinalGrade !== null)
    .map((j) => ({
      name: j.abbreviation,
      value: j.avgFinalGrade!,
    }));

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <h2 className="mb-4 text-sm font-semibold text-neutral-700">
          Sebaran Siswa per Jurusan
        </h2>
        {siswaData.length === 0 ? (
          <p className="text-sm text-neutral-500">Belum ada data jurusan.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={siswaData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                formatter={(value) => [Number(value ?? 0), "Siswa"]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {siswaData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-neutral-700">
          Rata-rata Nilai Akhir per Jurusan
        </h2>
        {nilaiData.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Belum ada data nilai. Nilai dihitung dari assessment dan project yang sudah dinilai.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={nilaiData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value) => [Number(value ?? 0), "Rata-rata Nilai"]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {nilaiData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}

