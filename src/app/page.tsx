import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold text-[#FF8833]">LMS Sekolah</p>
        <h1 className="mt-2 text-3xl font-semibold text-neutral-900">
          Selamat datang
        </h1>
        <p className="mt-3 text-sm text-neutral-600">
          Platform pembelajaran internal untuk Admin, Guru, Siswa, dan Kepala
          Sekolah.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex rounded-lg bg-[#FF8833] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#e6782b]"
        >
          Masuk
        </Link>
      </div>
    </main>
  );
}
