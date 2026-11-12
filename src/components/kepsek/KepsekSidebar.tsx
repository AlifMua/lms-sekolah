"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart2,
  GraduationCap,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/shared/LogoutButton";

const navItems = [
  { href: "/kepsek", label: "Dashboard", icon: LayoutDashboard },
  { href: "/kepsek/nilai", label: "Rekap Nilai", icon: BarChart2 },
  { href: "/kepsek/guru", label: "Guru & Mengajar", icon: GraduationCap },
];

type KepsekSidebarProps = {
  onNavigate?: () => void;
};

export function KepsekSidebar({ onNavigate }: KepsekSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-2 border-b border-neutral-200 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FF8833] text-white">
          <BookOpen size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-900">LMS Sekolah</p>
          <p className="text-xs text-neutral-500">Kepala Sekolah</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Monitoring
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/kepsek"
              ? pathname === "/kepsek"
              : pathname.startsWith(item.href);
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

