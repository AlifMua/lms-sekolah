"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

const titles: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/siswa": "Data Siswa",
  "/admin/guru": "Data Guru",
  "/admin/kelas": "Data Kelas",
  "/admin/jurusan": "Data Jurusan",
  "/admin/mapel": "Mata Pelajaran",
  "/admin/tahun-ajaran": "Tahun Ajaran",
  "/admin/pengaturan": "Pengaturan",
};

function getTitle(pathname: string) {
  if (pathname.startsWith("/admin/jurusan/") && pathname !== "/admin/jurusan") {
    return "Detail Jurusan";
  }

  return titles[pathname] ?? "Dashboard Admin";
}

type AdminShellProps = {
  children: React.ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-neutral-200">
        <AdminSidebar />
      </div>

      {isSidebarOpen ? (
        <div className="fixed inset-0 z-30 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            aria-label="Tutup menu"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="relative h-full w-64 border-r border-neutral-200">
            <AdminSidebar onNavigate={() => setIsSidebarOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <AdminHeader
          title={getTitle(pathname)}
          onMenuClick={() => setIsSidebarOpen(true)}
        />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
