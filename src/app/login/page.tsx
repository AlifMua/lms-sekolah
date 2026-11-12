"use client";

import { Suspense } from "react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";

const ROLE_ROUTES: Record<string, string> = {
  admin: "/admin",
  teacher: "/guru",
  student: "/siswa",
  principal: "/kepsek",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false, // tangani redirect manual agar bisa handle error
      });

      if (result?.error) {
        // next-auth meneruskan pesan dari throw new Error() di authorize()
        setError(result.error);
        return;
      }

      // Ambil session role user yang berhasil login
      const session = await getSession();
      const role = session?.user?.role;
      const targetDashboard = (role && ROLE_ROUTES[role]) ?? "/";

      // Jika ada callbackUrl dan route-nya sesuai dengan role user, arahkan ke sana
      const isCallbackValid =
        callbackUrl &&
        role &&
        callbackUrl.startsWith(ROLE_ROUTES[role]);

      router.push(isCallbackValid ? callbackUrl : targetDashboard);
      router.refresh(); // paksa refresh agar session terbaca di server component
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-6 text-center">
        <p className="text-2xl font-semibold text-neutral-900">LMS Sekolah</p>
        <p className="mt-1 text-sm text-neutral-500">
          Silakan masuk untuk melanjutkan
        </p>
      </div>

      {/* Error message */}
      {error ? (
        <div
          role="alert"
          className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      ) : null}

      {/* Email */}
      <div className="mb-4">
        <label
          htmlFor="email"
          className="mb-1 block text-sm font-medium text-neutral-800"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="contoh@sekolah.sch.id"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-800 outline-none focus:border-[#FF8833]"
        />
      </div>

      {/* Password */}
      <div className="mb-5">
        <label
          htmlFor="password"
          className="mb-1 block text-sm font-medium text-neutral-800"
        >
          Password
        </label>
        <div className="flex items-center rounded-lg border border-neutral-200 px-3 focus-within:border-[#FF8833]">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="Masukkan password"
            className="w-full py-2.5 text-sm text-neutral-800 outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="ml-2 text-neutral-500"
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Memproses..." : "Masuk"}
      </Button>

      <button
        type="button"
        className="mt-4 w-full text-center text-sm text-[#FF8833] hover:underline"
        onClick={() => setError("Fitur lupa password akan ditambahkan kemudian.")}
      >
        Lupa Password?
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <Suspense
        fallback={
          <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm text-center text-neutral-500">
            Memuat...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
