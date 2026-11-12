"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { updateProfile, changePassword, type ActionResult } from "@/actions/admin/pengaturan";

type Props = {
  initialName: string;
  initialEmail: string;
};

export function ProfilPenggunaTab({ initialName, initialEmail }: Props) {
  const [profilePending, startProfileTransition] = useTransition();
  const [pwPending, startPwTransition] = useTransition();

  const [profileResult, setProfileResult] = useState<ActionResult | null>(null);
  const [pwResult, setPwResult] = useState<ActionResult | null>(null);

  function handleProfile(formData: FormData) {
    startProfileTransition(async () => {
      const res = await updateProfile({ success: false }, formData);
      setProfileResult(res);
    });
  }

  function handlePassword(formData: FormData) {
    startPwTransition(async () => {
      const res = await changePassword({ success: false }, formData);
      setPwResult(res);
    });
  }

  return (
    <div className="space-y-6">
      {/* ── Update Profil ─────────────────────────────────────────────────────── */}
      <Card>
        <h2 className="mb-4 text-base font-semibold text-neutral-900">Profil Pengguna</h2>
        <form action={handleProfile} className="space-y-4">
          {profileResult?.error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{profileResult.error}</p>
          )}
          {profileResult?.success && (
            <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
              Profil berhasil diperbarui.
            </p>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="name">
              Nama Lengkap
            </label>
            <input
              id="name"
              name="name"
              type="text"
              defaultValue={initialName}
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-[#FF8833] focus:outline-none focus:ring-1 focus:ring-[#FF8833]"
            />
            {profileResult?.fieldErrors?.name && (
              <p className="mt-1 text-xs text-red-600">{profileResult.fieldErrors.name[0]}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={initialEmail}
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-[#FF8833] focus:outline-none focus:ring-1 focus:ring-[#FF8833]"
            />
            {profileResult?.fieldErrors?.email && (
              <p className="mt-1 text-xs text-red-600">{profileResult.fieldErrors.email[0]}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={profilePending}
            className="rounded-lg bg-[#FF8833] px-5 py-2 text-sm font-medium text-white hover:bg-[#e67722] disabled:opacity-60"
          >
            {profilePending ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </form>
      </Card>

      {/* ── Ganti Password ──────────────────────────────────────────────────── */}
      <Card>
        <h2 className="mb-4 text-base font-semibold text-neutral-900">Ganti Password</h2>
        <form action={handlePassword} className="space-y-4">
          {pwResult?.error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{pwResult.error}</p>
          )}
          {pwResult?.success && (
            <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
              Password berhasil diperbarui.
            </p>
          )}

          {(
            [
              { id: "currentPassword", label: "Password Lama", field: "currentPassword" },
              { id: "newPassword", label: "Password Baru", field: "newPassword" },
              { id: "confirmPassword", label: "Konfirmasi Password Baru", field: "confirmPassword" },
            ] as const
          ).map(({ id, label, field }) => (
            <div key={id}>
              <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor={id}>
                {label}
              </label>
              <input
                id={id}
                name={id}
                type="password"
                required
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-[#FF8833] focus:outline-none focus:ring-1 focus:ring-[#FF8833]"
              />
              {pwResult?.fieldErrors?.[field] && (
                <p className="mt-1 text-xs text-red-600">{pwResult.fieldErrors[field]![0]}</p>
              )}
            </div>
          ))}

          <button
            type="submit"
            disabled={pwPending}
            className="rounded-lg bg-[#FF8833] px-5 py-2 text-sm font-medium text-white hover:bg-[#e67722] disabled:opacity-60"
          >
            {pwPending ? "Memproses..." : "Ganti Password"}
          </button>
        </form>
      </Card>
    </div>
  );
}
