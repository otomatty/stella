/**
 * スキルツリー (ステージマップ) とスキルプロフィールの読み出し API (Phase 1)。
 *
 *   GET /api/skill-map/mine     … 星の状態・視界・解放条件・次の一歩
 *   GET /api/skill-profile/mine … XP の内訳とレベル、学習ストリークの要約
 *
 * どちらも **呼び出した本人ぶんだけ** を返す。他人のマップを覗く用途 (講師の
 * モニタリング) は本フェーズでは持たない。
 *
 * ## 視界の強制はここで行う
 *
 * 評価器 (`@falcon/shared/skill-map`) は「何をどこまで見せてよいか」を返すだけで、
 * 実際に伏せるのは API の仕事。伏せる場所を画面側に委ねると、DevTools と
 * `curl` で全部読めてしまい、視界制限が演出でしかなくなる。したがって:
 *
 *   - `locked` の星は **到達説明 (`can_do`) を返さない**。ロック中に見せるのは
 *     「何が要るか」(`lock_reasons`) だけ、という設計をここで確定させる
 *   - `name-only` の星はタイトルと解放条件まで。到達説明は返さない
 *   - `fog` の星は **タイトル・カテゴリ・テーマ・前提線まで** (画面はタイトルを
 *     ぼかして「予告」として見せる。前提線はリング = 深さの計算に要る)。slug・
 *     到達説明・解放条件・受講登録は返さない — URL を組める / 中身が分かる /
 *     個人の割当が読める情報は霧の向こうに出さない。テーマを持たないステージ
 *     (CMS で作った直後など) のテーマは `？？？` で埋める
 *   - **他の星の解放条件に混ぜて名前を漏らさない**。距離 3 以上の前提が
 *     `lock_reasons` にタイトルで出ると、霧の星の名前が手前の星から読めてしまう。
 *     そこも同じ規則 (テーマ名 → `？？？`) に伏せる
 *   - 発見教材 (`discoveries` / Phase 4) も同じ規則の下にある。載せるのは **承認済み
 *     かつ源流ステージが `active` / `cleared`** のものだけで、それ以外は存在ごと
 *     出さない — 教材名と説明はその星で何を学ぶかを直接語るため
 */

import { Hono } from "hono";
import { isDiscoveryVisible } from "@falcon/shared/discovery/types";
import { appearancePrerequisitesOf, appearancesOf } from "@falcon/shared/skill-map/appearances";
import { evaluateSkillMap, parentSlugOf } from "@falcon/shared/skill-map/evaluate";
import type {
  SkillMapLockReason,
  SkillMapState,
  SkillMapVisibility,
} from "@falcon/shared/skill-map/evaluate";
import { computeFocusBonus } from "@falcon/shared/skill-map/focus";
import { computeXp, levelProgress } from "@falcon/shared/skill-map/xp";
import {
  addStudyDays,
  computeStreaks,
  studyDateStartMs,
  toStudyDate,
} from "@falcon/shared/study/activity";

import { ApiError, errorResponse, getCaller } from "../lib/authz.js";
import {
  loadApprovedDiscoverySummaries,
  loadPassedDiscoveryCount,
  loadPassedDiscoveryIds,
} from "../lib/discovery-data.js";
import {
  isDevMode,
  loadEnrolledStageIds,
  loadFocusCompletions,
  loadSkillMapSource,
  loadSkillProfileCounts,
  loadStudyDays,
  saveFocusStageId,
  wantsDevReveal,
} from "../lib/skill-map-data.js";
import type { SkillMapSource } from "../lib/skill-map-data.js";
import { dropFromQueue } from "./stage-queue.js";
import type { Env } from "../env.js";

export const skillMapRoute = new Hono<{ Bindings: Env }>();

/**
 * 読み出した材料をそのまま評価器へ渡す。
 *
 * 呼ぶ場所が増えるほど「飛び級ぶんを渡し忘れた 1 か所」が生まれやすい (渡し忘れると
 * その画面だけ星が閉じて見える) ので、組み立ては 1 か所に閉じる。腕試し
 * (`routes/skill-check.ts`) もここを使う。
 */
export function evaluateSkillMapFor(source: SkillMapSource) {
  return evaluateSkillMap({
    stages: source.stages,
    clearedStageIds: source.clearedStageIds,
    ...(source.activeStageId ? { activeStageId: source.activeStageId } : {}),
    ...(source.unlockedStageIds ? { unlockedStageIds: source.unlockedStageIds } : {}),
  });
}

/** ストリーク算出のために遡る日数 (`/api/study-activity/mine` と同じ)。 */
const STREAK_LOOKBACK_DAYS = 365;

/**
 * 集中ボーナスの連続日数を数えるために遡る日数。
 *
 * 最上段 (5 日) の何倍かあれば足りるが、「◯日続いています」を長く見せられるよう
 * 四半期ぶんを見る。完了行だけなので件数は多くない。
 */
const FOCUS_LOOKBACK_DAYS = 120;

/**
 * 霧の中の星に出す名前。テーマも無いステージ (CMS で作った直後) の最後の逃げ場。
 *
 * 空文字にすると画面側が「名前の無い星」を描き分ける羽目になるので、必ず何か返す。
 */
const FOG_LABEL = "？？？";

/** slug に対応する見た目の複製先。無ければ項目ごと付けない。 */
function appearancesPayload(slug: string): { appearances?: string[] } {
  const sectors = appearancesOf(slug);
  return sectors && sectors.length > 0 ? { appearances: [...sectors] } : {};
}

/** 扇ごとの親 id。slug が無い霧でもレイアウトが線を張れるようにする。 */
function appearanceParentPayload(
  slug: string,
  idBySlug: Map<string, string>,
): { appearance_parent_ids?: Record<string, string> } {
  const groups = appearancePrerequisitesOf(slug);
  if (!groups) return {};
  const mapped: Record<string, string> = {};
  for (const [sector, slugs] of Object.entries(groups)) {
    const id = idBySlug.get(slugs[0] ?? "");
    if (id !== undefined) mapped[sector] = id;
  }
  return { appearance_parent_ids: mapped };
}

/**
 * `locked` の星の解放条件を、**視界に応じて伏せた**表示名にする。
 *
 * 評価器は「誰に見せるか」を知らないので、距離 3 以上 (霧) にある前提のタイトルを
 * テーマ名 / 伏せ字へ落とすのはこちらの仕事。スキルマップの応答と自己開始の 400 文言が
 * 別々にこれを組み立てると、片方だけ緩んだときに手前の星の解放条件から霧の星の名前が
 * 読めてしまうので、1 か所に置いて両方から呼ぶ。
 */
export function maskedLockReasons(
  source: SkillMapSource,
  result: ReturnType<typeof evaluateSkillMapFor>,
  stageId: string,
  revealDev = false,
): string[] {
  const byId = new Map(source.stages.map((stage) => [stage.id, stage]));
  return (result.lockReasons.get(stageId) ?? []).map((reason: SkillMapLockReason) =>
    !revealDev && reason.stageId !== undefined && result.visibility.get(reason.stageId) === "fog"
      ? (byId.get(reason.stageId)?.theme ?? FOG_LABEL)
      : reason.label,
  );
}

/**
 * フォーカスに選べない / 腕試しを受けられない星に返す汎用文言。
 *
 * 「存在しない」「割り当てられていない」「霧の中」を **区別しない**。理由を書き分けると、
 * 応答の違いから他人の割当や未公開ステージ、霧の向こうの星の有無を探れてしまう。
 *
 * 腕試し (`routes/skill-check.ts`) も霧の星を同じ文言で断る — そちらだけ別の文言に
 * すると、2 つの API の応答を突き合わせて霧の中の星の有無が読めてしまう。
 */
export const UNSELECTABLE_STAGE_MESSAGE = "受講登録のないステージは選べません";

/** 応答に載せる 1 つの星。視界に応じて欠ける項目がある。 */
export interface SkillMapStagePayload {
  id: string;
  state: SkillMapState;
  visibility: SkillMapVisibility;
  /** 霧の外でだけ入る (URL・API の識別子は霧の中に出さない)。 */
  slug?: string;
  /**
   * タイトルは **霧の中でも入る**。スキルツリーは霧の星も名前を「ぼかして」見せる
   * (先に何があるかの予告)。ぼかしは画面側の演出で、値そのものは開示している —
   * 隠したい名前の教材はそもそも公開しない、が線引き。
   */
  title?: string;
  category?: string;
  /** テーマ名 (カテゴリ相当の粗い括り)。霧の星のラベルのフォールバックでもある。 */
  theme?: string;
  /**
   * 講座アイコン (単色シルエット SVG) の R2 キー。**霧の外でだけ入る** — アイコンの形は
   * 講座の正体をそのまま語るので、slug と同じ秘匿ルールに従う。
   */
  icon_path?: string;
  /** `full` かつ locked でない星にだけ入る。 */
  can_do?: string;
  /**
   * locked かつ霧の外の星にだけ入る。未充足の前提の表示名 — 見えている前提はタイトル、
   * 霧の中の前提はテーマ名 / 伏せ字、未知 slug は「非公開の教材」。
   */
  lock_reasons?: string[];
  /**
   * 受講登録があるか (道の上で「今すぐ始められる星」を描き分けるのに使う)。
   *
   * **霧の星には付けない。** 名前 (title) は予告として見せるが、個人の割当状況まで
   * 霧の向こうに出す理由はない (「割り当てられた星がこの辺りにある」も情報になる)。
   */
  enrolled?: boolean;
  /**
   * 線を引く親ステージの id (スキルツリーが星と星を線で結び、深さ = リングを決めるのに使う)。
   * 線は 1 本だけ。解放条件 (前提 AND) は `lock_reasons` が名前で出す。
   *
   * **霧の星にも付ける。** 線が無いと盤面はその星の深さを計算できず、ずっと先の
   * スキルが内側のリングに置かれてしまう (前提の浅い星ほど中心に近い、が崩れる)。
   * トポロジは教材カタログの構造であって個人の学習状況でも未公開の中身でもない。
   */
  parent_id?: string;
  /**
   * 同じステージを複数の扇に置くときの扇名。実体は 1 つ (クリアは共有)。
   * **霧の星にも付ける。** slug を出さない霧でも、レイアウトが複製できるようにする。
   */
  appearances?: string[];
  /**
   * 扇ごとの親ステージ id。複製した星は自分の扇の親から線を引く。
   * **霧の星にも付ける。**
   */
  appearance_parent_ids?: Record<string, string>;
}

skillMapRoute.get("/api/skill-map/mine", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const revealDev = wantsDevReveal(c);
    const source = await loadSkillMapSource(db, caller, { showAllIslands: revealDev });
    const result = evaluateSkillMapFor(source);

    if (result.cycles.length > 0) {
      // 教材側 (manifest ビルド) で落ちるはずのもの。実行時に見えたら手で直す合図。
      console.error("[skill-map] 前提が循環しています", JSON.stringify(result.cycles));
    }

    const byId = new Map(source.stages.map((stage) => [stage.id, stage]));
    /** 前提は slug で書かれている (正本が id を知らないため)。線を引くのに id へ解く。 */
    const idBySlug = new Map(source.stages.map((stage) => [stage.slug, stage.id]));
    /** 霧の中の星に出してよい唯一の名前 (テーマ名。無ければ伏せ字)。 */
    const fogNameOf = (stageId: string): string => byId.get(stageId)?.theme ?? FOG_LABEL;

    // 線を引く親。前提は slug で書かれている (正本が id を知らないため) ので id へ解く。
    // 未知 slug (未公開 / 削除済み) は解けないので線も引かない — 生の slug を
    // 出さない評価器の規則を、こちらの項目でも同じに保つ。
    const parentIdOf = (stage: SkillMapSource["stages"][number]): { parent_id?: string } => {
      const slug = parentSlugOf(stage);
      const id = slug === undefined ? undefined : idBySlug.get(slug);
      return id === undefined ? {} : { parent_id: id };
    };

    const payload: SkillMapStagePayload[] = source.stages.map((stage) => {
      const state = result.states.get(stage.id) ?? "locked";
      const visibility = result.visibility.get(stage.id) ?? "fog";
      const base: SkillMapStagePayload = {
        id: stage.id,
        state,
        visibility,
        ...(stage.theme ? { theme: stage.theme } : {}),
        ...appearancesPayload(stage.slug),
        ...appearanceParentPayload(stage.slug, idBySlug),
      };
      // 霧の星: 通常は名前とカテゴリと前提の線まで (画面は名前をぼかして「予告」)。
      // slug・到達説明・解放条件・受講登録はここで止める。
      // 開発者表示 (`revealDev`) では slug と解放条件も載せる — 視界は fog のまま
      // (開始 / 腕試しは依然として断る) で、画面がぼかさず名前を出す材料にする。
      if (visibility === "fog") {
        if (!revealDev) {
          return {
            ...base,
            theme: fogNameOf(stage.id),
            title: stage.title,
            category: stage.category,
            ...parentIdOf(stage),
          };
        }
        return {
          ...base,
          slug: stage.slug,
          title: stage.title,
          category: stage.category,
          enrolled: source.enrolledStageIds?.has(stage.id) ?? false,
          ...parentIdOf(stage),
          ...(stage.iconPath ? { icon_path: stage.iconPath } : {}),
          ...(state === "locked"
            ? { lock_reasons: maskedLockReasons(source, result, stage.id, true) }
            : {}),
        };
      }

      const named: SkillMapStagePayload = {
        ...base,
        slug: stage.slug,
        title: stage.title,
        category: stage.category,
        enrolled: source.enrolledStageIds?.has(stage.id) ?? false,
        ...parentIdOf(stage),
        ...(stage.iconPath ? { icon_path: stage.iconPath } : {}),
        ...(state === "locked"
          ? { lock_reasons: maskedLockReasons(source, result, stage.id, revealDev) }
          : {}),
      };
      // 到達説明は「もう手が届く星」にだけ。ロック中と 2 歩先は解放条件だけを見せる。
      if (visibility === "full" && state !== "locked" && stage.canDo) {
        named.can_do = stage.canDo;
      }
      return named;
    });

    // 集中ボーナスは表示専用の係数 (XP の保存値は動かさない)。導出仕様は
    // `@falcon/shared/skill-map/focus` の JSDoc にまとめてある。
    const today = toStudyDate(new Date());
    const completions = await loadFocusCompletions(
      db,
      caller,
      studyDateStartMs(addStudyDays(today, -(FOCUS_LOOKBACK_DAYS - 1))),
    );
    const focusBonus = computeFocusBonus(completions, source.activeStageId, today);

    /**
     * 発見教材 (Phase 4)。**承認済み × 源流ステージが `active` / `cleared`** のものだけ。
     *
     * 秘匿の要点は「locked / 霧の星の教材は存在ごと出さない」こと — 教材名と説明文は
     * その星で何を学ぶかを直接語るので、道の先の星の中身が読めてしまう。判定は
     * 一覧も受験 (`routes/discovery.ts`) も同じ `isDiscoveryVisible` を通す。
     *
     * 読むのは見出しだけ (`loadApprovedDiscoverySummaries`)。ホームを開くたびに走る
     * 経路なので、受験でしか要らない設問の JSON 全文をここで運ばない。
     */
    const approved = await loadApprovedDiscoverySummaries(db, caller.tenantId);
    const visible = approved.filter((row) => isDiscoveryVisible(result.states.get(row.stageId)));
    const passedIds = await loadPassedDiscoveryIds(
      db,
      caller,
      visible.map((row) => row.id),
    );

    return c.json({
      skill_map: {
        stages: payload,
        discoveries: visible.map((row) => ({
          id: row.id,
          stage_id: row.stageId,
          title: row.title,
          description: row.description,
          // 設問そのものは受験票 (`GET /api/discovery/:id`) でだけ返す。
          // 一覧では全文を読まず、D1 に数えさせた件数だけを載せる。
          question_count: row.questionCount,
          /** 本人が既に合格したか (道の上に「合格済み」の印を出すため)。 */
          passed: passedIds.has(row.id),
        })),
        next_stage_ids: result.nextStageIds,
        active_stage_id: source.activeStageId ?? null,
        // `chosen` = 受講者が選んだ / `derived` = 直近の進捗から導出。
        active_stage_source: source.activeStageSource ?? "derived",
        cleared_count: source.clearedStageIds.size,
        focus_bonus: {
          streak_days: focusBonus.streakDays,
          multiplier: focusBonus.multiplier,
          next_tier_days: focusBonus.nextTierDays,
          next_multiplier: focusBonus.nextMultiplier,
        },
        generated_at: new Date().toISOString(),
        /** サーバの `DEV_MODE` が立っているか。FAB を出す判定に使う。 */
        dev_mode_available: isDevMode(c.env),
        /** この応答が開発者表示か (島全配信 + 霧の名前を明かす)。 */
        dev_mode: revealDev,
      },
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/**
 * いま進める星を 1 つに決める (`learner_focus` を upsert)。
 *
 * 受講登録のあるステージだけを許す — 割り当てられていない星をフォーカスにすると、
 * ホームの「続きから」が開けないレッスンを指してしまう。`null` はフォーカスを外す
 * 意味で受け付け、次回から導出フォールバックに戻る。
 *
 * **クリア済みの星も選ばせない。** 読み出し側 (`resolveActiveStage`) はクリア済みの
 * フォーカスを導出へ落とすので、保存できてしまうと「保存したのに反映されない」
 * 書き込みになる。受け付けないことで読み書きの規則を一致させる。
 *
 * **霧の中の星も選ばせない** (下の秘匿の理由を参照)。
 */
skillMapRoute.put("/api/skill-map/active-stage", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    type Body = { stageId?: unknown; stage_id?: unknown };
    const body: Body = await c.req.json<Body>().catch(() => ({}) as Body);
    // `?? ` で束ねると `{"stageId": null}` (フォーカス解除) が未指定に化けるため、
    // キーの有無で選ぶ。
    const raw = "stageId" in body ? body.stageId : body.stage_id;
    if (raw !== null && typeof raw !== "string") {
      throw new ApiError("stageId (文字列 または null) が必要です", 400);
    }
    const stageId = raw === null || raw === "" ? null : raw;

    if (stageId !== null) {
      const enrolled = await loadEnrolledStageIds(db, caller);
      if (!enrolled.has(stageId)) {
        // 「存在しない」と「割り当てられていない」を区別しない (他人の割当や
        // 未公開ステージの有無を、この応答から探れないようにする)。
        throw new ApiError(UNSELECTABLE_STAGE_MESSAGE, 400);
      }

      // 保存する前に評価器を 1 度回して、選んではいけない星を弾く。
      const source = await loadSkillMapSource(db, caller, { showAllIslands: wantsDevReveal(c) });
      if (source.clearedStageIds.has(stageId)) {
        // クリア済みは秘密ではない (本人が終わらせた星) ので、そのまま理由を返す。
        throw new ApiError("クリア済みのステージは選べません", 400);
      }
      const result = evaluateSkillMapFor(source);
      // 霧の星を自分で active にすると、その星と隣接が即 full になり、視界制限が
      // 受講者の操作で無効化される。割当済みなのに霧の彼方にある稀なケースは、
      // 前提を進めれば自然に見えてくるので、ここで閉じる方を採る。
      // 文言は未受講 / 存在しないときと同じ — 400 の出方から「割り当てられてはいる」
      // ことを読み取れると、霧の中に星があること自体を漏らすため。
      if ((result.visibility.get(stageId) ?? "fog") === "fog") {
        throw new ApiError(UNSELECTABLE_STAGE_MESSAGE, 400);
      }
    }

    await saveFocusStageId(db, caller, stageId);
    // 着手した星は「次にやるリスト」から外す (待ち行列に残すと二重に見える)。
    if (stageId !== null) await dropFromQueue(db, caller, stageId);
    return c.json({ active_stage_id: stageId });
  } catch (err) {
    return errorResponse(c, err);
  }
});

skillMapRoute.get("/api/skill-profile/mine", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const counts = await loadSkillProfileCounts(db, caller);
    // 合格した発見教材も XP に入る (Phase 4)。集計は教材 id で重ねを落とすので、
    // 同じ教材を何度合格しても 1 回ぶん。
    const passedDiscoveries = await loadPassedDiscoveryCount(db, caller);
    const xp = computeXp({ ...counts, passedDiscoveries });
    const progress = levelProgress(xp.total);

    const today = toStudyDate(new Date());
    const days = await loadStudyDays(db, caller, addStudyDays(today, -(STREAK_LOOKBACK_DAYS - 1)));
    const streaks = computeStreaks(days, today);

    return c.json({
      skill_profile: {
        xp: {
          total: xp.total,
          completed_lessons: xp.completedLessons,
          passed_quizzes: xp.passedQuizzes,
          cleared_stages: xp.clearedStages,
          passed_discoveries: xp.passedDiscoveries,
          from_lessons: xp.fromLessons,
          from_quizzes: xp.fromQuizzes,
          from_stages: xp.fromStages,
          from_discoveries: xp.fromDiscoveries,
        },
        level: {
          level: progress.level,
          xp_into_level: progress.xpIntoLevel,
          xp_to_next_level: progress.xpToNextLevel,
          next_level_at: progress.nextLevelAt,
        },
        streak: {
          current: streaks.current,
          longest: streaks.longest,
          today,
        },
        generated_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});
