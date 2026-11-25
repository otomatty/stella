import { and, eq, inArray, or, sql } from "drizzle-orm";
import type { NormalizedProgressRow } from "@stella/shared/study/progress-sync";
import type { Db } from "../db/client.js";
import { lessonProgress, lessons, submissions } from "../db/schema.js";
import {
  isProblemStepLesson,
  isProblemTaskOverviewLesson,
  loadPassedOverviewLessons,
} from "./lesson-progress-write.js";
import { chunk } from "./enrollment-bulk.js";

/**
 * 合格提出をそのレッスンの課題の合格として数える条件。`submissions.lesson_id` で `lessons` を
 * JOIN したクエリに足す。旧形式の提出の lesson_id / assignment_id は受講者が送る値なので、
 * コードレッスンは提出の課題がレッスンの課題 (`lessons.assignment_id`) と一致するものだけ。
 * assignment レッスンは従来どおり。
 */
export function passCountsForLesson() {
  return or(
    eq(lessons.type, "assignment"),
    and(eq(lessons.type, "code"), eq(lessons.assignmentId, submissions.assignmentId)),
  );
}

/** id リストのチャンク幅。固定バインド (受講者・判定) を引いて D1 の上限 100 に収める。 */
const IDS_PER_QUERY = 90;

/**
 * 受講者のレビュー合格があるコードレッスン。
 *
 * 旧形式の提出の lesson_id / assignment_id は受講者が送る値なので、指したレッスンの課題
 * (`lessons.assignment_id`) への提出である合格だけを数える。別の課題を名乗る提出の合格で
 * そのレッスンの完了を作らせない。`codeLessonIds` は呼び出し側で
 * `type = 'code'` を確かめたものを渡す。
 */
export async function reviewedPassLessonIds(
  db: Db,
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
  /** 完了をレビューの合格、または課題の一覧の合格から決めたレッスン。問題のレッスンは含めない。 */
  reviewedLessonIds: Set<string>;
}

/** 現存するレッスンの進捗を返す。コードはレビュー、一覧は課題の合格で完了を決め、問題のレッスンは捨てる。 */
export async function reviewedProgressRows(
  db: Db,
  userId: string,
  rows: NormalizedProgressRow[],
): Promise<ReviewedProgress> {
  const existing = new Set<string>();
  const problemSteps = new Set<string>();
  const reviewed = new Set<string>();
  const problemOverviewLessonIds = new Set<string>();
  const passed = new Set<string>();
  for (const ids of chunk(
    rows.map((r) => r.lessonId),
    IDS_PER_QUERY,
  )) {
    const existingLessons = await db
      .select({
        id: lessons.id,
        type: lessons.type,
        problemStep: isProblemStepLesson(sql`lessons.id`),
        problemOverview: isProblemTaskOverviewLesson(sql`lessons.id`),
      })
      .from(lessons)
      .where(inArray(lessons.id, ids));
    const codeLessonIds: string[] = [];
    for (const row of existingLessons) {
      existing.add(row.id);
      if (row.problemStep) {
        problemSteps.add(row.id);
        continue;
      }
      if (row.problemOverview) {
        reviewed.add(row.id);
        problemOverviewLessonIds.add(row.id);
        continue;
      }
      if (row.type !== "code") continue;
      reviewed.add(row.id);
      codeLessonIds.push(row.id);
    }
    const ok = await reviewedPassLessonIds(db, userId, codeLessonIds);
    for (const id of ok) passed.add(id);
  }
  for (const row of await loadPassedOverviewLessons(db, [userId], [...problemOverviewLessonIds])) {
    passed.add(row.lessonId);
  }
  return {
    rows: rows
      .filter((r) => existing.has(r.lessonId) && !problemSteps.has(r.lessonId))
      .map((r) =>
        reviewed.has(r.lessonId)
          ? {
              ...r,
              completed: passed.has(r.lessonId),
              countsTowardActivity:
                !problemOverviewLessonIds.has(r.lessonId) && r.countsTowardActivity,
            }
          : r,
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
