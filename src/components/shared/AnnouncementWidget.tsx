import { Card } from "@/components/ui/Card";
import type { AnnouncementItem } from "@/actions/admin/announcement";
import { Pin, Bell } from "lucide-react";

type Props = {
  items: AnnouncementItem[];
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const targetLabels: Record<string, string> = {
  all: "Semua",
  teacher: "Guru",
  student: "Siswa",
};

export function AnnouncementWidget({ items }: Props) {
  if (items.length === 0) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Bell size={16} className="text-[#FF8833]" />
          <h2 className="text-base font-semibold text-neutral-900">Pengumuman</h2>
        </div>
        <p className="text-sm text-neutral-500">Tidak ada pengumuman terbaru.</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Bell size={16} className="text-[#FF8833]" />
        <h2 className="text-base font-semibold text-neutral-900">Pengumuman</h2>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item._id}
            className={`rounded-lg border p-3 ${
              item.pinned
                ? "border-[#FF8833]/30 bg-[#FF8833]/5"
                : "border-neutral-200 bg-neutral-50"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {item.pinned && (
                  <Pin size={12} className="shrink-0 text-[#FF8833]" />
                )}
                <p className="text-sm font-semibold text-neutral-900">{item.title}</p>
              </div>
              <span className="shrink-0 rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                {targetLabels[item.targetRole]}
              </span>
            </div>
            <p className="mt-1 text-sm text-neutral-700 leading-relaxed">{item.content}</p>
            <p className="mt-2 text-xs text-neutral-400">
              {item.authorName} · {formatDate(item.createdAt)}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

