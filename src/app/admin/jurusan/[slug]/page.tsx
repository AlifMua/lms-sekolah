import { notFound } from "next/navigation";

import { JurusanBrowser } from "@/components/admin/JurusanBrowser";
import { Card } from "@/components/ui/Card";
import { getJurusanDetail } from "@/lib/admin-data";

type JurusanDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function JurusanDetailPage({
  params,
}: JurusanDetailPageProps) {
  const { slug } = await params;
  const detail = await getJurusanDetail(slug);

  if (!detail) {
    notFound();
  }

  const { jurusan, kelas } = detail;

  return (
    <div className="space-y-5">
      <Card>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#FF8833]">
          {jurusan.singkatan}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-neutral-900">
          {jurusan.nama}
        </h2>
      </Card>
      <JurusanBrowser jurusan={jurusan} kelas={kelas} />
    </div>
  );
}
