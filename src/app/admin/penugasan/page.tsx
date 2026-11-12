import { PenugasanPageClient } from '@/components/admin/PenugasanPageClient';
import { getPenugasanPageData } from '@/lib/penugasan-data';

export default async function PenugasanPage() {
  const data = await getPenugasanPageData();

  return (
    <PenugasanPageClient
      penugasanList={data.penugasanList}
      kelasWaliList={data.kelasWaliList}
      guruList={data.guruList}
      mapelList={data.mapelList}
      kelasList={data.kelasList}
      tahunAjaranList={data.tahunAjaranList}
    />
  );
}
