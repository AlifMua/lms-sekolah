import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Route handler untuk next-auth.
 * Semua request ke /api/auth/* (login, logout, session, csrf, dsb.)
 * ditangani otomatis oleh handler ini.
 */
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
