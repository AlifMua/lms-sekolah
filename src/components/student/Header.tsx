// src/components/student/Header.tsx
"use client";

import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";

type HeaderProps = {
  title: string;
  onMenuClick?: () => void;
};

export function Header({ title, onMenuClick }: HeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-neutral-200 bg-white p-4 lg:p-6">
      <button
        type="button"
        className={cn(
          "lg:hidden",
          "text-neutral-600 hover:text-neutral-900"
        )}
        onClick={onMenuClick}
        aria-label="Buka menu"
      >
        <Menu size={20} />
      </button>
      <h1 className="text-lg font-semibold text-neutral-900">{title}</h1>
      {/* Placeholder for future user avatar or logout */}
      <div className="w-8 h-8" />
    </header>
  );
}
