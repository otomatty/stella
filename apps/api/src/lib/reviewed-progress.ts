import { and, eq, inArray } from "drizzle-orm";
import type { NormalizedProgressRow } from "@stella/shared/study/progress-sync";
import type { Db } from "../db/client.js";
import { lessons, sections, stages, submissions } from "../db/schema.js";
import { chunk } from "./enrollment-bulk.js";

/** コードの完了はレビューの合格を正本にする。端末の自己申告で合格や取消を作らない。 */
export async function reviewedProgressRows(
  db: Db,
  tenantId: string,
  userId: string,
  rows: NormalizedProgressRow[],
): Promise<NormalizedProgressRow[]> {
  const reviewed = new Set<string>();
  const passed = new Set<string>();
  for (const ids of chunk(
    rows.map((r) => r.lessonId),
    90,
  )) {
    const codeLessons = await db
      .select({ id: lessons.id })
      .from(lessons)
      .innerJoin(sections, eq(sections.id, lessons.sectionId))
      .innerJoin(stages, eq(stages.id, sections.stageId))
      .where(
        and(inArray(lessons.id, ids), eq(stages.tenantId, tenantId), eq(lessons.type, "code")),
      );
    if (!codeLessons.length) continue;
    for (const l of codeLessons) reviewed.add(l.id);
    const passes = await db
      .select({ lessonId: submissions.lessonId })
      .from(submissions)
      .where(
        and(
          eq(submissions.tenantId, tenantId),
          eq(submissions.studentId, userId),
          eq(submissions.verdict, "pass"),
          inArray(
            submissions.lessonId,
            codeLessons.map((l) => l.id),
          ),
        ),
      );
    for (const s of passes) if (s.lessonId) passed.add(s.lessonId);
  }
  return rows.map((r) =>
    reviewed.has(r.lessonId) ? { ...r, completed: passed.has(r.lessonId) } : r,
  );
}
