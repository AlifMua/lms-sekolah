import type { Metadata } from "next";

import { SessionProviderWrapper } from "@/components/providers/SessionProviderWrapper";
import "./globals.css";

export const metadata: Metadata = {
  title: "LMS Sekolah",
  description: "Learning Management System internal sekolah",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full bg-white text-neutral-900 font-sans">
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
      </body>
    </html>
  );
}
