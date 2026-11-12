import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { ProfilPenggunaTab } from "@/components/admin/ProfilPenggunaTab";
import { ProfilSekolahTab } from "@/components/admin/ProfilSekolahTab";
import { getSchoolSetting, getSystemStats } from "@/actions/admin/pengaturan";

export default async function PengaturanPage() {
  const session = await getServerSession(authOptions);
  const [schoolSetting, stats] = await Promise.all([getSchoolSetting(), getSystemStats()]);

  const currentUser = {
    name: session?.user?.name ?? "",
    email: session?.user?.email ?? "",
  };

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Pengaturan Sistem</h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          Kelola profil pengguna, data sekolah, dan ringkasan sistem.
        </p>
      </div>

      {/* Grid layout: kiri - profil user, kanan - ringkasan sistem */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Kiri: Profil Pengguna + Ganti Password */}
        <div className="xl:col-span-2 space-y-6">
          <ProfilPenggunaTab
            initialName={currentUser.name}
            initialEmail={currentUser.email}
          />
        </div>

        {/* Kanan: Ringkasan Sistem */}
        <div>
          <Card>
            <h2 className="mb-4 text-base font-semibold text-neutral-900">Ringkasan Sistem</h2>
            <dl className="space-y-3">
              <div className="flex justify-between text-sm">
                <dt className="text-neutral-500">Tahun Ajaran Aktif</dt>
                <dd className="font-medium text-neutral-900">
                  {stats.tahunAjaranAktif ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-neutral-500">Siswa Aktif</dt>
                <dd className="font-medium text-neutral-900">{stats.totalSiswaAktif}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-neutral-500">Guru Aktif</dt>
                <dd className="font-medium text-neutral-900">{stats.totalGuruAktif}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-neutral-500">Total Kelas</dt>
                <dd className="font-medium text-neutral-900">{stats.totalKelas}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      {/* Profil Sekolah — full width */}
      <ProfilSekolahTab initialData={schoolSetting} />
    </div>
  );
}
