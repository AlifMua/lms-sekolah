import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email dan password wajib diisi");
        }

        await connectDB();

        // .lean() supaya dapat plain object, bukan Mongoose Document
        const user = await User.findOne({
          email: credentials.email.toLowerCase(),
        }).lean<{
          _id: unknown;
          email: string;
          password: string;
          username?: string;
          role: "admin" | "teacher" | "student" | "principal";
          isActive?: boolean;
        }>();

        if (!user) {
          // Sengaja pakai pesan generik (bukan "email tidak ditemukan")
          // supaya tidak membocorkan email mana yang terdaftar.
          throw new Error("Email atau password salah");
        }

        if (user.isActive === false) {
          throw new Error("Akun ini sudah dinonaktifkan. Hubungi admin.");
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValidPassword) {
          throw new Error("Email atau password salah");
        }

        return {
          id: String(user._id),
          name: user.username ?? user.email,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    // Simpan role & id ke dalam JWT token saat pertama kali login
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role: "admin" | "teacher" | "student" | "principal" }).role;
      }
      return token;
    },
    // Salurkan id & role dari token ke object session (dipakai di client via useSession())
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as
          | "admin"
          | "teacher"
          | "student"
          | "principal";
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};