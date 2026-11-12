// src/app/siswa/layout.tsx
"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { StudentSidebar } from "@/components/student/StudentSidebar";
import { Header } from "@/components/student/Header";

const titles: Record<string, string> = {
  "/siswa": "Dashboard Siswa",
  "/siswa/materi": "Materi",
  "/siswa/assessment": "Assessment",
  "/siswa/project": "Project",
  "/siswa/riwayat": "Riwayat",
  "/siswa/nilai": "Nilai",
};

function getTitle(pathname: string): string {
  if (titles[pathname]) return titles[pathname];
  const base = pathname.split("/").slice(0, 3).join("/");
  return titles[base] ?? "Dashboard Siswa";
}

export default function SiswaLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const title = getTitle(pathname);

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-neutral-200">
        <StudentSidebar />
      </div>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            aria-label="Tutup menu"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="relative h-full w-64 border-r border-neutral-200 bg-white">
            <StudentSidebar onNavigate={() => setIsSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col">
        <Header title={title} onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
