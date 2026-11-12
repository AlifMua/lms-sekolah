"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

type LogoutButtonProps = {
  /** Tampilkan label teks di samping ikon. Default: true */
  showLabel?: boolean;
  className?: string;
};

/**
 * Tombol logout yang memanggil signOut() dari next-auth.
 * Setelah logout, user diarahkan ke /login.
 *
 * Cara pakai:
 *   <LogoutButton />
 *   <LogoutButton showLabel={false} />
 */
export function LogoutButton({
  showLabel = true,
  className,
}: LogoutButtonProps) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={
        className ??
        "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
      }
    >
      <LogOut size={18} />
      {showLabel && <span>Logout</span>}
    </button>
  );
}
