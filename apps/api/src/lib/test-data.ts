/**
 * テストモード時のテストデータ投入。
 *
 * テナントの `test_mode` が ON のとき、 ユーザー登録 (招待) の直後に呼ばれ、
 * 新規ユーザーがすぐ画面を確認できる状態を作る:
 *
 *   - student: テナントの published コースへの受講登録 (期限 30 日後 / 必須)
 *              + 最初のレッスンを完了済みにする進捗
 *              + 直近数日の日別学習ログ (週間チャート / ストリークの確認用)
 *   - 全ロール: ウェルカム通知 1 件
 *
 * 招待自体を失敗させないため、 呼び出し側で best-effort (try/catch) にすること。
 */

import { and, asc, eq } from "drizzle-orm";
import { addStudyDays, toStudyDate } from "@falcon/shared/study/activity";

import type { Db } from "../db/client.js";
import {
  courses,
  enrollments,
  lessonProgress,
  lessons,
  notifications,
  sections,
  studyActivity,
} from "../db/schema.js";

const TEST_ENROLLMENT_DUE_DAYS = 30;

/**
 * 日別学習ログのテストデータ (今日を 0 とした「N 日前 → 学習秒数」)。
 * 意図的に 3 日前を空けて、 ストリークが途切れる挙動も確認できるようにしている
 * (この並びだと連続学習は「今日から 3 日」になる)。
 */
const TEST_STUDY_ACTIVITY: ReadonlyArray<{ daysAgo: number; watchedSec: number }> = [
  { daysAgo: 8, watchedSec: 1_800 },
  { daysAgo: 7, watchedSec: 2_700 },
  { daysAgo: 6, watchedSec: 1_200 },
  { daysAgo: 5, watchedSec: 3_600 },
  { daysAgo: 4, watchedSec: 900 },
  { daysAgo: 2, watchedSec: 2_400 },
  { daysAgo: 1, watchedSec: 1_500 },
  { daysAgo: 0, watchedSec: 600 },
];

export interface TestDataTarget {
  tenantId: string;
  userId: string;
  role: string;
  displayName: string;
  /** 招待した管理者 (enrollments.assigned_by に記録)。 */
  invitedBy: string;
}

export async function insertTestDataForNewUser(
  db: Db,
  target: TestDataTarget,
): Promise<void> {
  if (target.role === "student") {
    const published = await db
      .select({ id: courses.id, title: courses.title })
      .from(courses)
      .where(
        and(eq(courses.tenantId, target.tenantId), eq(courses.status, "published")),
      )
      .orderBy(asc(courses.createdAt));

    if (published.length > 0) {
      const dueAt = new Date(
        Date.now() + TEST_ENROLLMENT_DUE_DAYS * 86_400_000,
      );
      await db
        .insert(enrollments)
        .values(
          published.map((course) => ({
            tenantId: target.tenantId,
            userId: target.userId,
            courseId: course.id,
            assignedBy: target.invitedBy,
            dueAt,
            required: true,
          })),
        )
        .onConflictDoNothing({
          target: [enrollments.userId, enrollments.courseId],
        });

      // 最初のコースの最初のレッスンを完了済みにして、 進捗表示を確認できるようにする。
      const firstLesson = (
        await db
          .select({ id: lessons.id })
          .from(lessons)
          .innerJoin(sections, eq(lessons.sectionId, sections.id))
          .where(eq(sections.courseId, published[0]!.id))
          .orderBy(asc(sections.order), asc(lessons.order))
          .limit(1)
      )[0];
      if (firstLesson) {
        await db
          .insert(lessonProgress)
          .values({
            tenantId: target.tenantId,
            userId: target.userId,
            lessonId: firstLesson.id,
            completed: true,
            updatedAt: new Date(),
          })
          .onConflictDoNothing({
            target: [lessonProgress.userId, lessonProgress.lessonId],
          });
      }
    }

    // 週間学習チャート / 連続学習ストリークをすぐ確認できるよう、 日別ログも入れる。
    // 完了レッスン 1 件は「今日」に計上して lesson_progress と辻褄を合わせる。
    const today = toStudyDate(new Date());
    await db
      .insert(studyActivity)
      .values(
        TEST_STUDY_ACTIVITY.map((row) => ({
          tenantId: target.tenantId,
          userId: target.userId,
          date: addStudyDays(today, -row.daysAgo),
          watchedSec: row.watchedSec,
          completedLessons: row.daysAgo === 0 ? 1 : 0,
        })),
      )
      .onConflictDoNothing({
        target: [studyActivity.userId, studyActivity.date],
      });
  }

  await db.insert(notifications).values({
    userId: target.userId,
    tenantId: target.tenantId,
    type: "announcement",
    title: "ようこそ (テストデータ)",
    body: `${target.displayName} さんのアカウントはテストモード中に登録されたため、 動作確認用のテストデータ (受講登録・進捗) を投入しました。`,
    payload: { test_data: true },
  });
}
