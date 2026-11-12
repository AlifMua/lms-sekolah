// src/components/student/StudentSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, BookOpen, ClipboardList, FolderOpen, Clock, CheckCircle } from "lucide-react";
import { LogoutButton } from "@/components/shared/LogoutButton";

const navItems = [
  { href: "/siswa", label: "Dashboard", icon: LayoutDashboard },
  { href: "/siswa/materi", label: "Materi", icon: BookOpen },
  { href: "/siswa/assessment", label: "Assessment", icon: ClipboardList },
  { href: "/siswa/project", label: "Project", icon: FolderOpen },
  { href: "/siswa/riwayat", label: "Riwayat", icon: Clock },
  { href: "/siswa/nilai", label: "Nilai", icon: CheckCircle },
];

type StudentSidebarProps = {
  onNavigate?: () => void;
};

export function StudentSidebar({ onNavigate }: StudentSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-2 border-b border-neutral-200 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FF8833] text-white">
          <BookOpen size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-900">LMS Sekolah</p>
          <p className="text-xs text-neutral-500">Siswa</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Navigation
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/siswa"
              ? pathname === "/siswa"
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
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
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
