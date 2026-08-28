/**
 * スキルツリー / スキルプロフィールの読み出し (Phase 1)。
 *
 * D1 から評価器 (`@falcon/shared/skill-map`) の入力を組み立てるところまでを持つ。
 * 判定そのものは純関数側にあり、ここは「どの行がクリア扱いか」の定義だけを担う。
 *
 * **クリアの定義は既存の修了判定に合わせる**: `enrollments.status = 'completed'`
 * (修了証発行 / staff の手動確定でここに入る) **または** 失効していない修了証がある。
 * 片方だけ見ると、自動発行が切られたステージ (講師承認で修了証だけ出る) や、
 * 修了証を revoke したステージで判定が食い違う。
 */

import { and, count, countDistinct, desc, eq, gte, inArray, max } from "drizzle-orm";
import { READABLE_ENROLLMENT_STATUSES } from "@falcon/shared/enrollment/access";
import type { SkillMapStage } from "@falcon/shared/skill-map/evaluate";
import type { FocusCompletion } from "@falcon/shared/skill-map/focus";
import { toStudyDate } from "@falcon/shared/study/activity";

import type { Db } from "../db/client.js";
import {
  certificates,
  enrollments,
  learnerFocus,
  lessonProgress,
  lessons,
  quizAttempts,
  sections,
  stages,
  studyActivity,
} from "../db/schema.js";
import type { Caller } from "./authz.js";
import { loadUnlockedStageIds } from "./skill-check-data.js";

/**
 * 「いま進めている星」の候補として見る、直近に進捗が付いたステージの数。
 *
 * 最新 1 件だけ見ると、クリア済みステージの復習を開いた直後に「進行中」がそこへ移る。
 * 少し遡って、まだクリアしていないステージのうち最も新しいものを採る。
 *
 * 数えるのは **レッスン行ではなくステージ** (`group by`)。レッスン行で打ち切ると、
 * 1 つのステージを 30 レッスンぶん進めた受講者では候補が 1 ステージしか出ず、
 * それがクリア済みだったときに「進行中なし」になる。
 */
const ACTIVE_STAGE_CANDIDATES = 30;

/**
 * 壊れた `stages.prerequisites` に立てる番兵。
 *
 * どのステージの slug とも一致しないので、評価器は「決してクリアされない前提」として
 * その星を locked のまま残す。表示名も評価器が伏せる (生の値は受講者に出ない)。
 */
export const INVALID_PREREQUISITE_SENTINEL = "__invalid__";

/**
 * D1 の `stages.prerequisites` (JSON 配列文字列) を slug 配列にする。
 *
 * **壊れていたら「前提なし」ではなく番兵を返して locked 側に倒す。** 前提はハードロック
 * なので、JSON が壊れた行を「前提なし」と読むと、手で書き換えたり途中まで書いた行が
 * 黙って**全員に開く**。開きすぎより閉じすぎの方が直しやすい (誰も進めないので気付く)。
 */
export function parsePrerequisites(raw: string | null): string[] {
  // null / 空文字は「そもそも前提を書いていない」= 入口の星。壊れているのとは別。
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.error(
        "[skill-map] stages.prerequisites が JSON 配列ではありません",
        raw.slice(0, 120),
      );
      return [INVALID_PREREQUISITE_SENTINEL];
    }
    return parsed.filter((v): v is string => typeof v === "string" && v.trim() !== "");
  } catch {
    console.error("[skill-map] stages.prerequisites の JSON を読めません", raw.slice(0, 120));
    return [INVALID_PREREQUISITE_SENTINEL];
  }
}

export interface SkillMapSource {
  stages: SkillMapStage[];
  clearedStageIds: Set<string>;
  activeStageId?: string;
  /**
   * `activeStageId` の出どころ。`chosen` = 受講者が選んだ (learner_focus)、
   * `derived` = 直近の進捗から導出。画面が「自動で選ばれています」と断るのに使う。
   */
  activeStageSource?: "chosen" | "derived";
  /** 受講登録があるステージ (道の上で「始められる星」を描き分けるのに使う)。 */
  enrolledStageIds?: Set<string>;
  /**
   * 飛び級 (腕試し合格) で開いた星 (Phase 3a)。前提が未充足でも `unlocked` になり、
   * 視界の起点にもなる (評価器の `unlockedStageIds`)。
   *
   * **クリアではない** — この星を前提に持つ次の星は開かない。
   */
  unlockedStageIds?: Set<string>;
}

/** 呼び出し学習者ぶんの評価器入力を D1 から組み立てる。 */
export async function loadSkillMapSource(db: Db, caller: Caller): Promise<SkillMapSource> {
  const stageRows = await db
    .select({
      id: stages.id,
      slug: stages.slug,
      title: stages.title,
      category: stages.category,
      prerequisites: stages.prerequisites,
      canDo: stages.canDo,
      theme: stages.theme,
    })
    .from(stages)
    .where(and(eq(stages.tenantId, caller.tenantId), eq(stages.status, "published")));

  const clearedStageIds = await loadClearedStageIds(db, caller);
  const enrolledStageIds = await loadEnrolledStageIds(db, caller);
  const unlockedStageIds = await loadUnlockedStageIds(db, caller);
  const active = await resolveActiveStage(db, caller, clearedStageIds, enrolledStageIds);

  return {
    stages: stageRows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      category: row.category ?? "",
      prerequisites: parsePrerequisites(row.prerequisites),
      ...(row.canDo ? { canDo: row.canDo } : {}),
      ...(row.theme ? { theme: row.theme } : {}),
    })),
    clearedStageIds,
    enrolledStageIds,
    unlockedStageIds,
    ...(active.stageId ? { activeStageId: active.stageId, activeStageSource: active.source } : {}),
  };
}

/**
 * 「今すぐ中身を開ける」受講登録があるステージ id。
 *
 * ステータスの絞り込みはリポジトリ既存の規約 `READABLE_ENROLLMENT_STATUSES`
 * (active / completed) に合わせる。`expired` を混ぜると、期限切れで教材を開けない
 * 星が道の上で「始められる星」になり、フォーカスやキューが**開けないレッスン**を
 * 指してしまう (一覧には出るが開くと 404、の不一致そのもの)。
 *
 * テナントも絞る。ユーザ id で一意とはいえ、テナントを移った受講者の古い行が
 * 残っていると、他テナントの星をフォーカス / キューに載せられてしまう。
 */
export async function loadEnrolledStageIds(db: Db, caller: Caller): Promise<Set<string>> {
  const rows = await db
    .select({ stageId: enrollments.stageId })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, caller.id),
        eq(enrollments.tenantId, caller.tenantId),
        inArray(enrollments.status, [...READABLE_ENROLLMENT_STATUSES]),
      ),
    );
  return new Set(rows.map((row) => row.stageId));
}

/**
 * 「いま進めている星」を決める。**受講者が選んだ値が最優先**。
 *
 * 保存済みのフォーカス (`learner_focus`) を採るが、そのステージを既にクリアして
 * いたら導出へ落とす — クリアした星に張り付いたままだと、次の星へ進んだあとも
 * ホームが古い星を「続きから」と言い続けるため。明示的に null を保存している
 * (フォーカスを外した) 場合も導出に戻す。
 *
 * **いま読める受講登録が無いフォーカスは採らない。** 保存したあとに staff が登録を
 * 期限切れ / 削除にすると `learner_focus` の行だけが残る。それを `active` として
 * 返すと、教材 API は拒否するのにスキルマップだけが「進行中」と言い、そのステージの
 * 発見教材まで公開条件 (`active` または `cleared`) を満たしてしまう。
 */
export function isUsableFocus(
  chosen: string | undefined,
  clearedStageIds: Set<string>,
  enrolledStageIds: Set<string>,
): chosen is string {
  if (!chosen) return false;
  // クリア済みの星に張り付かない (次へ進んだあとも「続きから」と言い続けるため)。
  if (clearedStageIds.has(chosen)) return false;
  // 読める受講登録が無くなった星も採らない (staff が期限切れ / 削除にしたあと)。
  return enrolledStageIds.has(chosen);
}

async function resolveActiveStage(
  db: Db,
  caller: Caller,
  clearedStageIds: Set<string>,
  enrolledStageIds: Set<string>,
): Promise<{ stageId?: string; source: "chosen" | "derived" }> {
  const chosen = await loadFocusStageId(db, caller);
  if (isUsableFocus(chosen, clearedStageIds, enrolledStageIds)) {
    return { stageId: chosen, source: "chosen" };
  }
  const derived = await findActiveStageId(db, caller, clearedStageIds);
  return { ...(derived ? { stageId: derived } : {}), source: "derived" };
}

/** 保存済みのフォーカス (未設定 / 明示的な null なら undefined)。 */
export async function loadFocusStageId(db: Db, caller: Caller): Promise<string | undefined> {
  const rows = await db
    .select({ activeStageId: learnerFocus.activeStageId })
    .from(learnerFocus)
    .where(and(eq(learnerFocus.userId, caller.id), eq(learnerFocus.tenantId, caller.tenantId)))
    .limit(1);
  return rows[0]?.activeStageId ?? undefined;
}

/**
 * フォーカスを保存する (`null` = 外す)。
 *
 * 行は 1 人 1 行なので upsert。`tenant_id` も毎回書き直すのは、テナントを移った
 * 受講者の行が古いテナントに残らないようにするため。
 */
export async function saveFocusStageId(
  db: Db,
  caller: Caller,
  stageId: string | null,
): Promise<void> {
  await db
    .insert(learnerFocus)
    .values({
      userId: caller.id,
      tenantId: caller.tenantId,
      activeStageId: stageId,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: learnerFocus.userId,
      set: { tenantId: caller.tenantId, activeStageId: stageId, updatedAt: new Date() },
    });
}

/**
 * 集中ボーナスの材料 — 完了したレッスンの「日付 × ステージ」。
 *
 * `lesson_progress` は行の最終状態しか持たないので、完了日は `updated_at` を
 * アプリ基準 TZ の日付に落として代用する (`@falcon/shared/skill-map/focus` の
 * JSDoc に仕様として書いてある近似)。
 */
export async function loadFocusCompletions(
  db: Db,
  caller: Caller,
  fromMs: number,
): Promise<FocusCompletion[]> {
  const rows = await db
    .select({ stageId: sections.stageId, updatedAt: lessonProgress.updatedAt })
    .from(lessonProgress)
    .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .where(
      and(
        eq(lessonProgress.userId, caller.id),
        eq(lessonProgress.tenantId, caller.tenantId),
        eq(lessonProgress.completed, true),
        gte(lessonProgress.updatedAt, new Date(fromMs)),
      ),
    );
  return rows.map((row) => ({ stageId: row.stageId, date: toStudyDate(row.updatedAt) }));
}

/** 修了扱いのステージ id (登録の completed ∪ 有効な修了証)。 */
export async function loadClearedStageIds(db: Db, caller: Caller): Promise<Set<string>> {
  const completed = await db
    .select({ stageId: enrollments.stageId })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, caller.id),
        eq(enrollments.tenantId, caller.tenantId),
        eq(enrollments.status, "completed"),
      ),
    );
  const certified = await db
    .select({ stageId: certificates.stageId })
    .from(certificates)
    .where(
      and(
        eq(certificates.userId, caller.id),
        eq(certificates.tenantId, caller.tenantId),
        eq(certificates.revoked, false),
      ),
    );
  return new Set([...completed, ...certified].map((row) => row.stageId));
}

/**
 * 「いま進めている星」= 直近に進捗が付いた、まだクリアしていないステージ。
 *
 * 受講登録の順番ではなく実際の進捗で決める。割当は staff がまとめて作るので、
 * 登録日から選ぶと「触ってもいない星が進行中」になる。
 *
 * ステージ単位に畳んでから (`group by`) 最終更新の新しい順に採る。レッスン行のまま
 * 上位 N 件で打ち切ると、進捗の多い 1 ステージだけで N 件が埋まり、他のステージが
 * 候補から落ちる (クリア済みステージを復習していると「進行中なし」になる)。
 */
async function findActiveStageId(
  db: Db,
  caller: Caller,
  clearedStageIds: Set<string>,
): Promise<string | undefined> {
  const lastAt = max(lessonProgress.updatedAt);
  const rows = await db
    .select({ stageId: sections.stageId, lastAt })
    .from(lessonProgress)
    .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .where(and(eq(lessonProgress.userId, caller.id), eq(lessonProgress.tenantId, caller.tenantId)))
    .groupBy(sections.stageId)
    .orderBy(desc(lastAt))
    .limit(ACTIVE_STAGE_CANDIDATES);
  return rows.find((row) => !clearedStageIds.has(row.stageId))?.stageId;
}

export interface SkillProfileCounts {
  completedLessons: number;
  passedQuizzes: number;
  clearedStages: number;
}

/** XP の材料 (完了レッスン数 / 合格クイズ数 / クリアステージ数)。 */
export async function loadSkillProfileCounts(db: Db, caller: Caller): Promise<SkillProfileCounts> {
  const lessonRows = await db
    .select({ n: count() })
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.userId, caller.id),
        eq(lessonProgress.tenantId, caller.tenantId),
        eq(lessonProgress.completed, true),
      ),
    );
  // クイズは「合格した設問セットの数」。同じクイズに何度合格しても 1 回ぶん。
  const quizRows = await db
    .select({ n: countDistinct(quizAttempts.quizId) })
    .from(quizAttempts)
    .where(
      and(
        eq(quizAttempts.userId, caller.id),
        eq(quizAttempts.tenantId, caller.tenantId),
        eq(quizAttempts.passed, true),
      ),
    );
  const clearedStageIds = await loadClearedStageIds(db, caller);
  return {
    completedLessons: Number(lessonRows[0]?.n ?? 0),
    passedQuizzes: Number(quizRows[0]?.n ?? 0),
    clearedStages: clearedStageIds.size,
  };
}

/** ストリーク要約のための日別ログ (既存の `/api/study-activity/mine` と同じ読み方)。 */
export async function loadStudyDays(
  db: Db,
  caller: Caller,
  from: string,
): Promise<{ date: string; watched_sec: number; completed_lessons: number }[]> {
  const rows = await db
    .select({
      date: studyActivity.date,
      watchedSec: studyActivity.watchedSec,
      completedLessons: studyActivity.completedLessons,
    })
    .from(studyActivity)
    .where(
      and(
        eq(studyActivity.userId, caller.id),
        eq(studyActivity.tenantId, caller.tenantId),
        gte(studyActivity.date, from),
      ),
    );
  return rows.map((row) => ({
    date: row.date,
    watched_sec: row.watchedSec,
    completed_lessons: row.completedLessons,
  }));
}
