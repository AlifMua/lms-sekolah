"use client";

import { Menu } from "lucide-react";

import { Button } from "@/components/ui/Button";

type AdminHeaderProps = {
  title: string;
  onMenuClick: () => void;
};

export function AdminHeader({ title, onMenuClick }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 lg:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          className="px-2 lg:hidden"
          onClick={onMenuClick}
          aria-label="Buka menu"
        >
          <Menu size={20} />
        </Button>
        <h1 className="text-lg font-semibold text-neutral-900">{title}</h1>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-neutral-800">Admin Sekolah</p>
        <p className="text-xs text-neutral-500">Tahun ajaran 2025/2026</p>
      </div>
    </header>
  );
}
