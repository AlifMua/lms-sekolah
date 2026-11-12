import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

/**
 * Ambil admin yang sedang login (server-side) untuk dipakai di Server Action.
 * Mengembalikan null jika belum login atau bukan admin. Server Action adalah
 * endpoint POST publik, jadi pengecekan ini WAJIB di dalam setiap action admin.
 */
export async function getAdminFromSession(): Promise<{ id: string; name: string } | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") return null;
  return { id: session.user.id, name: session.user.name ?? session.user.email ?? "Admin" };
}
