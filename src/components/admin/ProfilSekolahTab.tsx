"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { saveSchoolSetting, type ActionResult, type SchoolSettingData } from "@/actions/admin/pengaturan";

type Props = {
  initialData: SchoolSettingData;
};

const fields: { id: keyof SchoolSettingData; label: string; type?: string }[] = [
  { id: "schoolName", label: "Nama Sekolah" },
  { id: "npsn", label: "NPSN" },
  { id: "address", label: "Alamat" },
  { id: "phone", label: "Nomor Telepon" },
  { id: "email", label: "Email Resmi Sekolah", type: "email" },
  { id: "principalName", label: "Nama Kepala Sekolah" },
];

export function ProfilSekolahTab({ initialData }: Props) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await saveSchoolSetting({ success: false }, formData);
      setResult(res);
    });
  }

  return (
    <Card>
      <h2 className="mb-4 text-base font-semibold text-neutral-900">Profil Sekolah</h2>
      <form action={handleSubmit} className="space-y-4">
        {result?.error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{result.error}</p>
        )}
        {result?.success && (
          <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
            Pengaturan sekolah berhasil disimpan.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(({ id, label, type }) => (
            <div key={id} className={id === "address" ? "sm:col-span-2" : ""}>
              <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor={id}>
                {label}
              </label>
              {id === "address" ? (
                <textarea
                  id={id}
                  name={id}
                  rows={2}
                  defaultValue={initialData[id]}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-[#FF8833] focus:outline-none focus:ring-1 focus:ring-[#FF8833]"
                />
              ) : (
                <input
                  id={id}
                  name={id}
                  type={type ?? "text"}
                  defaultValue={initialData[id]}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-[#FF8833] focus:outline-none focus:ring-1 focus:ring-[#FF8833]"
                />
              )}
              {result?.fieldErrors?.[id] && (
                <p className="mt-1 text-xs text-red-600">{result.fieldErrors[id]![0]}</p>
              )}
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[#FF8833] px-5 py-2 text-sm font-medium text-white hover:bg-[#e67722] disabled:opacity-60"
        >
          {pending ? "Menyimpan..." : "Simpan Pengaturan"}
        </button>
      </form>
    </Card>
  );
}
