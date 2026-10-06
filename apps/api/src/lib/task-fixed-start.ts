import { and, asc, eq, lte, or, sql } from "drizzle-orm";
import type { SupportEvent } from "@stella/shared/tasks/submission";
import type { Db } from "../db/client.js";
import { taskFixedStartUses, tasks } from "../db/schema.js";

/**
 * 固定した開始点を受け取った受講者の提出には、支援記録に `fixed-start` を必ず含める (01 §4)。
 * 拡張が課題フォルダーに残す `.stella/support.json` は手元で消せるので、サーバーの記録で補う。
 * 支援付きの合格はスキルの証拠を「支援付き」にする (罰ではなく記録)。
 *
 * 開始点は前の課題の動く実装を含むので、後の課題の開始点を受け取ったあとは、その開始点が
 * 実装を含む前の課題 (受け取りの行の `covered_task_ids`) の提出も支援付きにする。開始点を
 * 写せば前の課題も出せるため。支援記録は提出を受け付けた時点で決めて保存するので、受け取る
 * より前の提出は変わらない。
 */
/**
 * 受講者がこの課題に関わる固定した開始点を受け取った記録: この課題の開始点の受け取りか、
 * 開始点がこの課題の実装を含んでいた (`covered_task_ids` に含む) 後の課題の受け取り。
 */
export function fixedStartUsesOf(scope: { tenantId: string; userId: string; taskId: string }) {
  return and(
    eq(taskFixedStartUses.tenantId, scope.tenantId),
    eq(taskFixedStartUses.userId, scope.userId),
    or(
      eq(taskFixedStartUses.taskId, scope.taskId),
      sql`exists (select 1 from json_each(${taskFixedStartUses.coveredTaskIds}) where value = ${scope.taskId})`,
    ),
  );
}

export async function withRecordedFixedStart(
  db: Db,
  scope: { tenantId: string; userId: string; taskId: string },
  support: SupportEvent[],
  /** 提出の時刻。これより後の受け取りは数えない (受け取る前の提出は変えない)。 */
  submittedAt: Date,
): Promise<SupportEvent[]> {
  if (support.some((event) => event.kind === "fixed-start")) return support;
  const uses = await db
    .select({
      taskId: taskFixedStartUses.taskId,
      title: tasks.title,
      usedAt: taskFixedStartUses.usedAt,
    })
    .from(taskFixedStartUses)
    .innerJoin(tasks, eq(tasks.id, taskFixedStartUses.taskId))
    .where(and(fixedStartUsesOf(scope), lte(taskFixedStartUses.usedAt, submittedAt)))
    .orderBy(asc(taskFixedStartUses.usedAt));
  // この課題の開始点の記録を優先し、無ければ前の課題として含まれた最初の受け取りを使う。
  const used = uses.find((u) => u.taskId === scope.taskId) ?? uses[0];
  if (!used) return support;
  return [
    ...support,
    {
      kind: "fixed-start",
      at: used.usedAt.toISOString(),
      detail:
        used.taskId === scope.taskId
          ? "固定した開始点を受け取った記録 (LMS)"
          : `後の課題「${used.title}」の固定した開始点を受け取った記録 (LMS)`,
    },
  ];
}
