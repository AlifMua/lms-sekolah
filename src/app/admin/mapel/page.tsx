import { connectDB } from '@/lib/mongodb';
import Subject from '@/models/Subject';
import { MapelPageClient } from '@/components/admin/MapelPageClient';
import type { MapelItem } from '@/components/admin/dialogs/MapelDialog';

export default async function MapelPage() {
  await connectDB();
  const raw = await Subject.find({})
    .sort({ category: 1, name: 1 })
    .lean<Array<{ _id: unknown; name: string; code: string; category: string }>>()

  const items: MapelItem[] = raw.map((s) => ({
    _id: String(s._id),
    name: s.name,
    code: s.code,
    category: s.category as MapelItem['category'],
  }));

  return <MapelPageClient items={items} />;
}
