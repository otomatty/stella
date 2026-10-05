import { and, eq, inArray } from "drizzle-orm";
import type { NormalizedProgressRow } from "@stella/shared/study/progress-sync";
import type { Db } from "../db/client.js";
import { lessonProgress, lessons, sections, stages, submissions } from "../db/schema.js";
import { chunk } from "./enrollment-bulk.js";

/** id リストのチャンク幅。固定バインド (テナント・受講者・判定) を引いて D1 の上限 100 に収める。 */
const IDS_PER_QUERY = 90;

/**
 * 受講者のレビュー合格があるコードレッスン。
 *
 * 旧形式の提出の lesson_id / assignment_id は受講者が送る値なので、指したレッスンの課題
 * (`lessons.assignment_id`) への提出である合格だけを数える。別の課題を名乗る提出の合格で
 * そのレッスンの完了を作らせない。`codeLessonIds` は呼び出し側でテナントと
 * `type = 'code'` を確かめたものを渡す。
 */
export async function reviewedPassLessonIds(
  db: Db,
  tenantId: string,
  userId: string,
  codeLessonIds: readonly string[],
): Promise<Set<string>> {
  const passed = new Set<string>();
  for (const ids of chunk([...codeLessonIds], IDS_PER_QUERY)) {
    const rows = await db
      .selectDistinct({ lessonId: submissions.lessonId })
      .from(submissions)
      .innerJoin(
        lessons,
        and(
          eq(lessons.id, submissions.lessonId),
          eq(lessons.assignmentId, submissions.assignmentId),
        ),
      )
      .where(
        and(
          eq(submissions.tenantId, tenantId),
          eq(submissions.studentId, userId),
          eq(submissions.verdict, "pass"),
          inArray(submissions.lessonId, ids),
        ),
      );
    for (const r of rows) if (r.lessonId) passed.add(r.lessonId);
  }
  return passed;
}

export interface ReviewedProgress {
  rows: NormalizedProgressRow[];
  /** 完了を端末の申告ではなくレビューの合格から決めたコードレッスン。 */
  reviewedLessonIds: Set<string>;
}

/** コードの完了はレビューの合格を正本にする。端末の自己申告で合格や取消を作らない。 */
export async function reviewedProgressRows(
  db: Db,
  tenantId: string,
  userId: string,
  rows: NormalizedProgressRow[],
): Promise<ReviewedProgress> {
  const reviewed = new Set<string>();
  const passed = new Set<string>();
  for (const ids of chunk(
    rows.map((r) => r.lessonId),
    IDS_PER_QUERY,
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
    const ok = await reviewedPassLessonIds(
      db,
      tenantId,
      userId,
      codeLessons.map((l) => l.id),
    );
    for (const id of ok) passed.add(id);
  }
  return {
    rows: rows.map((r) =>
      reviewed.has(r.lessonId) ? { ...r, completed: passed.has(r.lessonId) } : r,
    ),
    reviewedLessonIds: reviewed,
  };
}

/** 指定レッスンのうち、受講者の進捗が完了で保存されているもの。 */
export async function storedCompletedLessonIds(
  db: Db,
  userId: string,
  lessonIds: readonly string[],
): Promise<string[]> {
  const out: string[] = [];
  for (const ids of chunk([...lessonIds], IDS_PER_QUERY)) {
    const rows = await db
      .select({ lessonId: lessonProgress.lessonId })
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.userId, userId),
          eq(lessonProgress.completed, true),
          inArray(lessonProgress.lessonId, ids),
        ),
      );
    out.push(...rows.map((r) => r.lessonId));
  }
  return out;
}
