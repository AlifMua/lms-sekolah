import { requirePrincipal, getGuruBebanMengajar } from "@/lib/kepsek";
import { Card } from "@/components/ui/Card";

export default async function KepsekGuruPage() {
  await requirePrincipal();
  const guruList = await getGuruBebanMengajar();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Guru & Beban Mengajar</h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          Daftar penugasan guru pada tahun ajaran aktif beserta jumlah materi yang diterbitkan.
        </p>
      </div>

      {guruList.length === 0 ? (
        <Card className="p-6 text-sm text-neutral-500">
          Belum ada penugasan mengajar pada tahun ajaran aktif.
        </Card>
      ) : (
        <div className="space-y-4">
          {guruList.map((guru) => (
            <Card key={guru.teacherId}>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-neutral-900">{guru.teacherName}</h2>
                  <p className="text-xs text-neutral-500">
                    {guru.assignments.length} penugasan · {guru.materiCount} materi diterbitkan
                  </p>
                </div>
                <span className="rounded-full bg-[#FF8833]/10 px-3 py-1 text-xs font-medium text-[#FF8833]">
                  {guru.assignments.length} mapel
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {guru.assignments.map((a, i) => (
                  <span
                    key={i}
                    className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs text-neutral-700"
                  >
                    {a.className} — {a.subjectName}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

