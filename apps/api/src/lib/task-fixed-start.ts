import { and, asc, eq } from "drizzle-orm";
import type { SupportEvent } from "@stella/shared/tasks/submission";
import type { Db } from "../db/client.js";
import { taskFixedStartUses } from "../db/schema.js";

/**
 * 固定した開始点を受け取った受講者の提出には、支援記録に `fixed-start` を必ず含める (01 §4)。
 * 拡張が課題フォルダーに残す `.stella/support.json` は手元で消せるので、サーバーの記録で補う。
 * 支援付きの合格はスキルの証拠を「支援付き」にする (罰ではなく記録)。
 */
export async function withRecordedFixedStart(
  db: Db,
  userId: string,
  taskId: string,
  support: SupportEvent[],
): Promise<SupportEvent[]> {
  if (support.some((event) => event.kind === "fixed-start")) return support;
  const [used] = await db
    .select({ usedAt: taskFixedStartUses.usedAt })
    .from(taskFixedStartUses)
    .where(and(eq(taskFixedStartUses.userId, userId), eq(taskFixedStartUses.taskId, taskId)))
    .orderBy(asc(taskFixedStartUses.usedAt))
    .limit(1);
  if (!used) return support;
  return [
    ...support,
    {
      kind: "fixed-start",
      at: used.usedAt.toISOString(),
      detail: "固定した開始点を受け取った記録 (LMS)",
    },
  ];
}
