"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { KepsekSidebar } from "@/components/kepsek/KepsekSidebar";
import { Header } from "@/components/student/Header";

const titles: Record<string, string> = {
  "/kepsek": "Dashboard Kepala Sekolah",
  "/kepsek/nilai": "Rekap Nilai",
  "/kepsek/guru": "Guru & Beban Mengajar",
};

function getTitle(pathname: string): string {
  return titles[pathname] ?? "Dashboard Kepala Sekolah";
}

export default function KepsekLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const title = getTitle(pathname);

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-neutral-200">
        <KepsekSidebar />
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
            <KepsekSidebar onNavigate={() => setIsSidebarOpen(false)} />
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

