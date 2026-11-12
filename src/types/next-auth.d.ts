import "next-auth";

/**
 * Type augmentation untuk next-auth.
 *
 * Menambahkan field `id` dan `role` ke dalam:
 *   - Session.user  (dipakai via useSession() di client)
 *   - JWT token     (dipakai di callbacks jwt & session di authOptions)
 *
 * Pastikan file ini di-include oleh tsconfig.json.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: "admin" | "teacher" | "student" | "principal";
    };
  }

  interface User {
    id: string;
    role: "admin" | "teacher" | "student" | "principal";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "admin" | "teacher" | "student" | "principal";
  }
}
