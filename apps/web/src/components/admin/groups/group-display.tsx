import { Badge } from "@/components/ui/badge";
import type { GroupSummary } from "@/lib/admin-groups-api";

const dateTime = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  dateStyle: "medium",
  timeStyle: "short",
});

export function GroupTime({ value }: { value: string }) {
  return <time dateTime={value}>{dateTime.format(new Date(value))}</time>;
}

export function GroupKind({ group }: { group: GroupSummary }) {
  return (
    <Badge className="max-w-full whitespace-normal break-all">
      {group.kind === "admin" ? "管理者" : `連携: ${group.clientName ?? "—"}`}
    </Badge>
  );
}
