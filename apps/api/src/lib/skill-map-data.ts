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
import { evaluateSkillMap, isSelectableVisibility } from "@falcon/shared/skill-map/evaluate";
import type { SkillMapStage } from "@falcon/shared/skill-map/evaluate";
import type { FocusCompletion } from "@falcon/shared/skill-map/focus";
import { filterIslandStages } from "@falcon/shared/skill-map/islands";
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
import {
  dropOrphanGrantedStages,
  filterStagesByAudience,
  loadGrantedStageIds,
} from "./stage-audience.js";

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

/**
 * 開発モードか (`Env.DEV_MODE`)。ローカル開発専用 — 本番には設定しない。
 *
 * 真なのは **開発者表示を出せる** こと。実際に出すかはリクエストヘッダ
 * (`shouldRevealDevMap`) で、画面の FAB がオンのときだけ島を全配信し霧を明かする。
 * 解放条件はそのまま — 見えるだけで locked の星は開かない。
 */
export function isDevMode(env: { DEV_MODE?: string }): boolean {
  return env.DEV_MODE === "1" || env.DEV_MODE === "true";
}

/**
 * クライアントが開発者表示を要求するヘッダ。値は `"1"` / `"0"`。
 * 本番では `isDevMode` が偽なので、ヘッダを付けても無視する。
 */
export const DEV_MODE_HEADER = "X-Falcon-Dev-Mode";

/**
 * このリクエストで島を全配信し、霧の星も名前を明かしていいか。
 *
 * env オフ → 常に否。env オン + ヘッダ `"0"` / `"false"` → 否 (FAB オフ)。
 * env オン + ヘッダ未指定は真 — 以前は env だけで出していた互換。
 */
export function shouldRevealDevMap(
  env: { DEV_MODE?: string },
  header: string | undefined,
): boolean {
  if (!isDevMode(env)) return false;
  if (header === "0" || header === "false") return false;
  return true;
}

/**
 * クライアントが「視界の段を 4 つとも扱える」と申告する **クエリ引数**。値は段の版。
 *
 * ## なぜ版を切るか
 *
 * `visibility` に `edge` / `hidden` を足したのは **wire の後方非互換な変更**で、
 * それを知らない画面は `fog` 以外を普通の星として描く (旧 `describeStar()` は
 * `visibility === "fog"` のときだけ操作を隠す)。デプロイは `deploy:api` →
 * `deploy:web` の順で、しかも**開いたままのタブは古い bundle のまま**なので、
 * 「新 API + 旧画面」は必ず起きる。そのとき線だけのはずの幽霊ノードが
 * 「？？？」のロック星として描かれ、押すと必ず 400 になる腕試しボタンまで出る。
 *
 * そこで申告の無いクライアントには **幽霊ノードを配らない** (`full` / `fog` だけ)。
 * 旧画面は今までどおり名前のある星だけを描き、失敗する導線も出ない。段を増やした
 * ことを知っている画面だけが 4 段ぶんを受け取る。
 *
 * ## ヘッダではなくクエリ引数にする理由
 *
 * 独自ヘッダは **サーバ側の CORS 許可リストに載っていないとプリフライトで弾かれる**
 * (= その API 呼び出しが丸ごと失敗する)。API をロールバックしたときのように
 * 「新しい画面 + 古い API」になると、古い API はこのヘッダを知らないので、
 * 意図した緩やかな縮退どころか **全ての API 呼び出しが落ちる**。
 * クエリ引数なら CORS の対象外で、知らないサーバは黙って無視する。
 *
 * 画面が全部入れ替わったら、この引数ごと落としてよい (移行用の足場)。
 */
export const SKILL_MAP_TIERS_PARAM = "tiers";

/** 幽霊ノード (`edge`) を配ってよい版。 */
const SKILL_MAP_TIERS_WITH_EDGE = 2;

/** そのリクエストの画面が幽霊ノードを描けるか (申告が無ければ否 = 配らない)。 */
export function acceptsGhostStars(declared: string | undefined): boolean {
  const version = Number.parseInt(declared ?? "", 10);
  return Number.isFinite(version) && version >= SKILL_MAP_TIERS_WITH_EDGE;
}

/** Hono コンテキストから開発者表示フラグを読む。 */
export function wantsDevReveal(c: {
  env: { DEV_MODE?: string };
  req: { header: (name: string) => string | undefined };
}): boolean {
  return shouldRevealDevMap(c.env, c.req.header(DEV_MODE_HEADER));
}

/** `loadSkillMapSource` の読み方の調整。 */
export interface SkillMapLoadOptions {
  /** 島の表示条件を無視して全ステージを返す (開発モード)。 */
  showAllIslands?: boolean;
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
export async function loadSkillMapSource(
  db: Db,
  caller: Caller,
  opts?: SkillMapLoadOptions,
): Promise<SkillMapSource> {
  const stageRows = await db
    .select({
      id: stages.id,
      slug: stages.slug,
      title: stages.title,
      category: stages.category,
      prerequisites: stages.prerequisites,
      parent: stages.parent,
      canDo: stages.canDo,
      theme: stages.theme,
      iconPath: stages.iconPath,
      audience: stages.audience,
    })
    .from(stages)
    .where(and(eq(stages.tenantId, caller.tenantId), eq(stages.status, "published")));

  const grantedStageIds = await loadGrantedStageIds(db, caller.id);
  const audienceRows = filterStagesByAudience(stageRows, grantedStageIds);

  const clearedStageIds = await loadClearedStageIds(db, caller);
  const enrolledStageIds = await loadEnrolledStageIds(db, caller);
  const unlockedStageIds = await loadUnlockedStageIds(db, caller);

  // 島 (資格 / AI) は表示条件を満たすまで存在ごと返さない。ここ (評価器入力の
  // 組み立て口) で落とすので、スキルマップ・腕試し・開始・発見教材のどの API も
  // 同じ星を同じ条件で伏せる — 経路ごとに緩みが生まれない。
  // 開発モード (`showAllIslands`) だけは素通しにして、島の中身を作りながら確かめられるようにする。
  const islandRows = opts?.showAllIslands
    ? audienceRows
    : filterIslandStages(audienceRows, clearedStageIds);
  const visibleRows = dropOrphanGrantedStages(islandRows);

  const mapStages: SkillMapStage[] = visibleRows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category ?? "",
    prerequisites: parsePrerequisites(row.prerequisites),
    ...(row.parent ? { parent: row.parent } : {}),
    ...(row.canDo ? { canDo: row.canDo } : {}),
    ...(row.theme ? { theme: row.theme } : {}),
    ...(row.iconPath ? { iconPath: row.iconPath } : {}),
  }));

  const active = await resolveActiveStage(
    db,
    caller,
    clearedStageIds,
    enrolledStageIds,
    selectableActiveStages(mapStages, clearedStageIds, unlockedStageIds),
  );

  return {
    stages: mapStages,
    clearedStageIds,
    enrolledStageIds,
    unlockedStageIds,
    ...(active.stageId ? { activeStageId: active.stageId, activeStageSource: active.source } : {}),
  };
}

/**
 * 「進行中」に据えてよい星 (視界が `full` のもの) を、**active を注入する前の地図**で数える。
 *
 * `active` の星は評価器で無条件に距離 0 の起点になる。つまり保存済みのフォーカスや
 * 進捗由来のフォーカスをそのまま注入すると、**その星と隣が問答無用で `full` に昇格**し、
 * slug・到達説明・解放条件まで返る。書き込み側 (`PUT /api/skill-map/active-stage`) は
 * 霧より先の星を断るのに、読み出し側だけがそれを迂回できてしまう。
 *
 * 迂回は絵空事ではない: 視界の段を変える前は 2 歩先の星もフォーカスに保存できたので、
 * **その頃の `learner_focus` 行がそのまま残っている**。新しい規則では `fog` になる星を、
 * 古い行が `full` へ昇格させ続ける。
 *
 * そこで active を空にした地図を 1 度作り、そこで `full` の星だけを候補にする。
 * 「クリア済みのフォーカスは読み出し側で導出へ落とす」のと同じ、読み書きの規則を
 * 一致させるための判定。
 */
export function selectableActiveStages(
  mapStages: SkillMapStage[],
  clearedStageIds: Set<string>,
  unlockedStageIds: Set<string>,
): (stageId: string) => boolean {
  let allowed: Set<string> | undefined;
  return (stageId: string): boolean => {
    if (allowed === undefined) {
      const base = evaluateSkillMap({
        stages: mapStages,
        clearedStageIds,
        ...(unlockedStageIds.size > 0 ? { unlockedStageIds } : {}),
      });
      allowed = new Set(
        [...base.visibility.entries()]
          .filter(([, visibility]) => isSelectableVisibility(visibility))
          .map(([id]) => id),
      );
    }
    return allowed.has(stageId);
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
/**
 * 保存済みフォーカスの「読める登録があり、まだクリアしていない」判定。
 *
 * **視界の判定はここには無い** — 星の集合が要るので `selectableActiveStages` が担い、
 * `resolveActiveStage` が両方を AND で使う。
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
  /** 視界の規則で「進行中」に据えてよい星か (`selectableActiveStages`)。 */
  isSelectable: (stageId: string) => boolean,
): Promise<{ stageId?: string; source: "chosen" | "derived" }> {
  const chosen = await loadFocusStageId(db, caller);
  if (isUsableFocus(chosen, clearedStageIds, enrolledStageIds) && isSelectable(chosen)) {
    return { stageId: chosen, source: "chosen" };
  }
  // 視界の判定は候補を走査しながら掛ける — 先頭 1 件で打ち切ると、据えてよい古い星が
  // あっても「進行中なし」になる (`pickActiveStageId` の JSDoc)。
  const derived = await findActiveStageId(db, caller, clearedStageIds, isSelectable);
  return { ...(derived !== undefined ? { stageId: derived } : {}), source: "derived" };
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
  /** 視界の規則で「進行中」に据えてよい星か (`selectableActiveStages`)。 */
  isSelectable: (stageId: string) => boolean,
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
  return pickActiveStageId(
    rows.map((row) => row.stageId),
    clearedStageIds,
    isSelectable,
  );
}

/**
 * 進捗の新しい順に並んだ候補から、「進行中」に据えてよい最初の星を選ぶ。
 *
 * **弾いた候補で打ち切らない。** 先頭がクリア済み / 視界の外だったからといって
 * 「進行中なし」に倒すと、その受講者が持っている**もう少し古い、据えてよい星**まで
 * 一緒に落ちて、ホームの「続きから」も集中ボーナスも消える。上の
 * `ACTIVE_STAGE_CANDIDATES` 件を数えている意味がなくなる。
 */
export function pickActiveStageId(
  candidates: readonly string[],
  clearedStageIds: Set<string>,
  isSelectable: (stageId: string) => boolean,
): string | undefined {
  return candidates.find((stageId) => !clearedStageIds.has(stageId) && isSelectable(stageId));
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
