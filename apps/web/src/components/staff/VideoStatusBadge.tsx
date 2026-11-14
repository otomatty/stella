import { Badge } from "@/components/ui/badge";
import type { lessonVideoStatus } from "./staff-stage-detail";

export function VideoStatusBadge({ status }: { status: ReturnType<typeof lessonVideoStatus> }) {
  if (status === "none") return null;
  const labels = { published: "公開中", stale: "前の版を公開中", missing: "未作成" };
  const variants = { published: "success", stale: "warning", missing: "danger" } as const;
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}
