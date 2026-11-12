"use client";

import { useMemo, useState } from "react";

import { Card } from "@/components/ui/Card";
import type { Jurusan, Kelas } from "@/types/admin";

type JurusanBrowserProps = {
  jurusan: Jurusan;
  kelas: Kelas[];
};

export function JurusanBrowser({ jurusan, kelas }: JurusanBrowserProps) {
  const [query, setQuery] = useState("");

  const filteredKelas = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    if (!keyword) {
      return kelas;
    }

    return kelas.filter((item) => {
      return (
        item.nama.toLowerCase().includes(keyword) ||
        item.waliKelas.toLowerCase().includes(keyword) ||
        item.tingkat.toLowerCase().includes(keyword)
      );
    });
  }, [kelas, query]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">
            Kelas {jurusan.singkatan}
          </h2>
          <p className="text-sm text-neutral-500">
            {kelas.length} kelas terdaftar di jurusan ini
          </p>
        </div>
        <label className="block w-full sm:max-w-xs">
          <span className="sr-only">Cari kelas</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari kelas atau wali kelas"
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-800 outline-none focus:border-[#FF8833]"
          />
        </label>
      </div>

      {filteredKelas.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-500">
            Tidak ada kelas yang cocok dengan pencarian.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredKelas.map((item) => (
            <Card key={item.id} className="hover:border-[#FF8833]/40">
              <p className="text-xs font-medium uppercase tracking-wide text-[#FF8833]">
                Tingkat {item.tingkat}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-neutral-900">
                {item.nama}
              </h3>
              <p className="mt-2 text-sm text-neutral-600">
                Wali kelas: {item.waliKelas}
              </p>
              <p className="mt-4 text-sm font-medium text-neutral-800">
                {item.jumlahSiswa} siswa
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
