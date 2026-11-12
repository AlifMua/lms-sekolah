import { requirePrincipal, getKepsekGradebook } from "@/lib/kepsek";
import { KepsekNilaiClient } from "@/components/kepsek/KepsekNilaiClient";

export default async function KepsekNilaiPage() {
  await requirePrincipal();
  const groups = await getKepsekGradebook();

  return <KepsekNilaiClient groups={groups} />;
}

