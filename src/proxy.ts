import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Peta role → prefix halaman yang boleh diakses.
 * Jika role tidak ada di daftar ini, akses ke prefix itu akan diblokir.
 */
const ROLE_ROUTES: Record<string, string> = {
  admin: "/admin",
  teacher: "/guru",
  student: "/siswa",
  principal: "/kepsek",
};

/**
 * Proxy Next.js — berjalan di Edge Runtime sebelum setiap request.
 *
 * Aturan:
 * 1. Jika user belum login → redirect ke /login (kecuali sudah di /login atau /).
 * 2. Jika user sudah login tapi mengakses route yang bukan miliknya → redirect ke dashboard-nya sendiri.
 * 3. Jika user sudah login lalu mengakses /login → redirect ke dashboard-nya.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ambil JWT token dari cookie (tidak butuh DB call — murni Edge-compatible)
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isLoggedIn = Boolean(token);
  const userRole = token?.role as string | undefined;

  // ── Halaman yang sepenuhnya publik (tidak perlu cek) ──────────────────────
  const isPublicPath = pathname === "/" || pathname === "/login";
  if (isPublicPath) {
    // Jika sudah login dan mencoba buka /login, redirect ke dashboard
    if (isLoggedIn && userRole && pathname === "/login") {
      const dashboardPath = ROLE_ROUTES[userRole] ?? "/";
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }
    return NextResponse.next();
  }

  // ── Belum login → paksa ke /login ─────────────────────────────────────────
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", request.url);
    // Simpan halaman yang ingin dituju agar bisa redirect setelah login
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Sudah login → cek apakah role-nya boleh akses route ini ───────────────
  if (userRole) {
    const allowedPrefix = ROLE_ROUTES[userRole];

    // Cek apakah pathname dimulai dengan prefix yang bukan milik role ini
    const isAccessingWrongRole = Object.values(ROLE_ROUTES).some(
      (prefix) => pathname.startsWith(prefix) && prefix !== allowedPrefix,
    );

    if (isAccessingWrongRole) {
      // Redirect ke dashboard yang sesuai dengan role-nya
      return NextResponse.redirect(new URL(allowedPrefix ?? "/", request.url));
    }
  }

  return NextResponse.next();
}

/**
 * Tentukan path mana yang diproses oleh proxy ini.
 * Pola di bawah mengecualikan:
 * - File statis (_next/static, _next/image, favicon, dsb.)
 * - API routes next-auth (/api/auth/*)
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
