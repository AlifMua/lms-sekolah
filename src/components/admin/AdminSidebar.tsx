"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  BookMarked,
  Calendar,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Users,
  School,
  Layers,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/shared/LogoutButton";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/siswa", label: "Siswa", icon: Users },
  { href: "/admin/guru", label: "Guru", icon: GraduationCap },
  { href: "/admin/kelas", label: "Kelas", icon: School },
  { href: "/admin/jurusan", label: "Jurusan", icon: Layers },
  { href: "/admin/mapel", label: "Mata Pelajaran", icon: BookMarked },
  { href: "/admin/penugasan", label: "Penugasan Guru", icon: ClipboardList },
  { href: "/admin/tahun-ajaran", label: "Tahun Ajaran", icon: Calendar },
  { href: "/admin/pengaturan", label: "Pengaturan", icon: Settings },
];

type AdminSidebarProps = {
  onNavigate?: () => void;
};

export function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-2 border-b border-neutral-200 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FF8833] text-white">
          <BookOpen size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-900">LMS Sekolah</p>
          <p className="text-xs text-neutral-500">Admin</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          User Management
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                isActive
                  ? "bg-[#FF8833]/10 text-[#FF8833]"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900",
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-neutral-200 p-3">
        <LogoutButton className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-600 hover:bg-red-50 hover:text-red-600 transition-colors" />
      </div>
    </aside>
  );
}
