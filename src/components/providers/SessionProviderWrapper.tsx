"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

type SessionProviderWrapperProps = {
  children: React.ReactNode;
  /**
   * Opsional: pass server-side session dari layout Server Component
   * agar tidak ada flash loading di sisi client.
   */
  session?: Session | null;
};

/**
 * Wrapper tipis di atas SessionProvider dari next-auth.
 * Dipasang di root layout (src/app/layout.tsx) agar useSession()
 * dan getSession() bisa dipakai di seluruh komponen client.
 */
export function SessionProviderWrapper({
  children,
  session,
}: SessionProviderWrapperProps) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
