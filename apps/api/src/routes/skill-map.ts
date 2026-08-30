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
 *   - `fog` の星 (2 歩先) は **タイトル・カテゴリ・テーマ・前提線まで** (画面はタイトルを
 *     ぼかして「予告」として見せる。前提線はリング = 深さの計算に要る)。slug・
 *     到達説明・**解放条件**・受講登録は返さない — URL を組める / 中身が分かる /
 *     個人の割当が読める情報は霧の向こうに出さない。テーマを持たないステージ
 *     (CMS で作った直後など) のテーマは `？？？` で埋める
 *   - `edge` の星 (3 歩先) は **線を引くためのトポロジだけ** (id・扇・親)。名前も
 *     テーマも返さない。画面は星を描かず、手前の星から伸びる線を薄くフェードさせる
 *   - `hidden` の星 (4 歩以上) は **配列から落とす**。id を返すだけでも「この先に星が
 *     n 個ある」という情報になる。`edge` の星が **自分の親として** 指してよいのは
 *     描かれる星だけ (幽霊どうしを結ぶと、どちらの端にも星の無い線が宙に浮く) —
 *     逆向き、描かれる星の親が幽霊、は残す (それが「その先へ続く」フェード線)
 *   - **他の星の解放条件に混ぜて名前を漏らさない**。`full` でない前提が
 *     `lock_reasons` にタイトルで出ると、ぼかしたはずの名前が手前の星から読めてしまう。
 *     そこも同じ規則 (テーマ名 → `？？？`) に伏せる (線の無い前提 = AND の 2 本目は
 *     視界の外にあり得るので、解放条件を 1 歩先に絞ってもこの伏せ字は要る)
 *   - 発見教材 (`discoveries` / Phase 4) も同じ規則の下にある。載せるのは **承認済み
 *     かつ源流ステージが `active` / `cleared`** のものだけで、それ以外は存在ごと
 *     出さない — 教材名と説明はその星で何を学ぶかを直接語るため
 */

import { Hono } from "hono";
import { isDiscoveryVisible } from "@falcon/shared/discovery/types";
import { appearancePrerequisitesOf, appearancesOf } from "@falcon/shared/skill-map/appearances";
import {
  evaluateSkillMap,
  isSelectableVisibility,
  isStarVisible,
  parentSlugOf,
} from "@falcon/shared/skill-map/evaluate";
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
  SKILL_MAP_TIERS_PARAM,
  acceptsGhostStars,
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

/**
 * 扇ごとの親 id。線を引いてよい親 (`accepts`) だけを挙げる。
 */
function appearanceParentIdsOf(
  slug: string,
  idBySlug: ReadonlyMap<string, string>,
  accepts: (parentId: string) => boolean,
): Record<string, string> | undefined {
  const groups = appearancePrerequisitesOf(slug);
  if (!groups) return undefined;
  const mapped: Record<string, string> = {};
  for (const [sector, slugs] of Object.entries(groups)) {
    const id = idBySlug.get(slugs[0] ?? "");
    if (id !== undefined && accepts(id)) mapped[sector] = id;
  }
  return mapped;
}

/**
 * 見た目の複製先と、扇ごとの親 id。**線を張れる扇だけを挙げる。**
 *
 * 親が応答に載らない扇まで挙げると、盤面はその扇に**親の無い複製**を生やす
 * (`radial-layout.ts` の `expandAppearances`)。名前も線も無い幽霊ノードだと、
 * 誰にも見えない星のために扇がまるごと 1 つ開き、盤面に空白の楔が残る。
 *
 * どの扇にも張れないときは複製そのものを止める (項目ごと付けない) — 星は自分の
 * `category` の扇に 1 つだけ置かれる。
 */
function appearancePayloads(
  slug: string,
  idBySlug: ReadonlyMap<string, string>,
  accepts: (parentId: string) => boolean,
): { appearances?: string[]; appearance_parent_ids?: Record<string, string> } {
  const sectors = appearancesOf(slug);
  if (!sectors || sectors.length === 0) return {};
  const parents = appearanceParentIdsOf(slug, idBySlug, accepts);
  // 扇ごとの前提を持たない複製 (カタログに組が無い) は、従来どおり全部の扇に置く。
  if (!parents) return { appearances: [...sectors] };
  const anchored = sectors.filter((sector) => parents[sector] !== undefined);
  if (anchored.length === 0) return {};
  return { appearances: anchored, appearance_parent_ids: parents };
}

/**
 * `locked` の星の解放条件を、**視界に応じて伏せた**表示名にする。
 *
 * 評価器は「誰に見せるか」を知らないので、まだ名前の出ていない (`full` でない) 前提の
 * タイトルをテーマ名 / 伏せ字へ落とすのはこちらの仕事。スキルマップの応答と自己開始の 400 文言が
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
  const masked = (reason: SkillMapLockReason): boolean =>
    !revealDev &&
    reason.stageId !== undefined &&
    (result.visibility.get(reason.stageId) ?? "hidden") !== "full";
  return (result.lockReasons.get(stageId) ?? []).map((reason: SkillMapLockReason) =>
    masked(reason)
      ? ((reason.stageId === undefined ? undefined : byId.get(reason.stageId)?.theme) ?? FOG_LABEL)
      : reason.label,
  );
}

/**
 * フォーカスに選べない / 腕試しを受けられない星に返す汎用文言。
 *
 * 「存在しない」「割り当てられていない」「霧より先」を **区別しない**。理由を書き分けると、
 * 応答の違いから他人の割当や未公開ステージ、霧の向こうの星の有無を探れてしまう。
 *
 * 触れてよいのは `full` (0〜1 歩) の星だけ (`isSelectableVisibility`)。腕試し
 * (`routes/skill-check.ts`) と自己開始 (`routes/stage-start.ts`) も同じ判定と同じ文言で
 * 断る — どれか 1 つだけ別の文言にすると、応答を突き合わせて先の星の有無が読めてしまう。
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
  /**
   * 扇 (ルート / 島) の名前。**`edge` の星にも入る** — 幽霊ノードをどの扇のどの島に
   * 置くかが決まらないと、線がまったく違う方向へ伸びてしまう。扇の名前は盤面に
   * 既に見出しとして出ているものなので、名前の秘匿とは別の情報。
   */
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
   * `full` かつ locked の星にだけ入る (2 歩先から先には出さない)。未充足の前提の表示名 —
   * 名前の見えている前提はタイトル、それ以外はテーマ名 / 伏せ字、未知 slug は「非公開の教材」。
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
   * **霧の星にも `edge` の星にも付ける。** 線が無いと盤面はその星の深さを計算できず、
   * ずっと先のスキルが内側のリングに置かれてしまう (前提の浅い星ほど中心に近い、が崩れる)。
   * トポロジは教材カタログの構造であって個人の学習状況でも未公開の中身でもない。
   * 応答に載らない星 (`hidden`) を指す親は付けない (端点の無い線は引けない)。
   */
  parent_id?: string;
  /**
   * 同じステージを複数の扇に置くときの扇名。実体は 1 つ (クリアは共有)。
   * **霧の星にも `edge` の星にも付ける。** slug を出さなくてもレイアウトが複製できるようにする。
   *
   * 挙げるのは **線を張れる扇だけ** (`appearance_parent_ids` に親がいる扇)。親の無い扇まで
   * 挙げると、盤面がその扇に親の無い複製を生やし、空白の楔が残る。`edge` の複製では
   * さらに、親も幽霊の扇を落とす (両端に星の無い線を引かない)。
   */
  appearances?: string[];
  /**
   * 扇ごとの親ステージ id。複製した星は自分の扇の親から線を引く。
   * **霧の星にも `edge` の星にも付ける。**
   */
  appearance_parent_ids?: Record<string, string>;
}

skillMapRoute.get("/api/skill-map/mine", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const revealDev = wantsDevReveal(c);
    // 段を増やしたことを知らない画面には幽霊ノードを配らない (`SKILL_MAP_TIERS_PARAM`)。
    // 開発者表示は自分の画面でしか使わないので、そちらは常に素通し。
    const ghostStars = revealDev || acceptsGhostStars(c.req.query(SKILL_MAP_TIERS_PARAM));
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

    const visibilityOf = (stageId: string): SkillMapVisibility =>
      result.visibility.get(stageId) ?? "hidden";

    /** 自分の線の親 id (前提は slug で書かれているので id へ解く)。 */
    const ownParentIdOf = (stage: SkillMapSource["stages"][number]): string | undefined => {
      const slug = parentSlugOf(stage);
      return slug === undefined ? undefined : idBySlug.get(slug);
    };

    /**
     * 線を引いてよい親か。
     *
     * - **応答に載らない星は端点にできない** (未知 slug・`hidden`・落とした幽霊)。
     *   端点の届かない線は引けないうえ、id だけでも「その先に星がある」という情報になる
     * - **幽霊ノード (`edge`) の線は、描かれる星 (`full` / `fog`) にしか繋がない。**
     *   幽霊どうしを結ぶと、どちらの端にも星の無い線が宙に浮く。複製 (`appearances`)
     *   では実際に起きる — Git は FE 扇では JS (霧) の次だが、BE 扇では Node (幽霊) の
     *   次なので、その扇の線は「見えない星から見えない星へ」になってしまう
     *
     * 開発者表示は段を素通しで全部描くので、この制限は掛けない。
     */
    const acceptsParent = (
      childId: string,
      parentId: string | undefined,
      ids: ReadonlySet<string>,
    ): parentId is string => {
      if (parentId === undefined || !ids.has(parentId)) return false;
      if (revealDev || visibilityOf(childId) !== "edge") return true;
      return isStarVisible(visibilityOf(parentId));
    };

    /**
     * 応答に載せる星の id。開発者表示ではすべて、通常は `hidden` (4 歩以上) を落とす。
     * 段を知らない画面 (`ghostStars` が偽) には `edge` も配らない。
     *
     * **幽霊ノード (`edge`) はここでは落とさない。** 線は親の側からも子の側からも
     * 生えるので (`c` の親が幽霊 `x` なら、描かれる `c` から `x` へフェードする線が要る)、
     * 「自分の親が星でない」だけで落とすと、必要なフェード線ごと消えてしまう。
     * 幽霊は距離 3 = 必ず距離 2 の星と辺で繋がっているので、線を 1 本も持たない
     * 幽霊はそもそも生まれない。
     *
     * 親 id の伏せ方をここから引くので、先に集合を作ってから 1 星ずつ組み立てる。
     */
    const delivered = new Set(
      source.stages
        .filter((stage) => {
          const visibility = visibilityOf(stage.id);
          if (revealDev) return true;
          if (visibility === "hidden") return false;
          // 旧い画面は `edge` を普通の星として描いてしまう (「？？？」のロック星 +
          // 必ず 400 になる腕試しボタン)。申告の無いクライアントには配らない。
          return ghostStars || isStarVisible(visibility);
        })
        .map((stage) => stage.id),
    );

    /** 線を引く親 (引いてよい相手のときだけ)。判定は `acceptsParent` に寄せる。 */
    const parentIdOf = (stage: SkillMapSource["stages"][number]): { parent_id?: string } => {
      const id = ownParentIdOf(stage);
      return acceptsParent(stage.id, id, delivered) ? { parent_id: id } : {};
    };

    const payload: SkillMapStagePayload[] = source.stages.flatMap((stage) => {
      const state = result.states.get(stage.id) ?? "locked";
      const visibility = visibilityOf(stage.id);
      // 4 歩以上先と、線を引けない幽霊は存在ごと出さない (上の `delivered` を参照)。
      if (!delivered.has(stage.id)) return [];
      const base: SkillMapStagePayload = {
        id: stage.id,
        state,
        visibility,
        ...appearancePayloads(stage.slug, idBySlug, (id) => acceptsParent(stage.id, id, delivered)),
      };

      // 開発者表示は段を素通し (名前も解放条件も載せる)。視界の値はそのままなので、
      // 開始 / 腕試しは依然としてサーバが断る。
      if (revealDev) {
        return [
          {
            ...base,
            slug: stage.slug,
            title: stage.title,
            category: stage.category,
            ...(stage.theme ? { theme: stage.theme } : {}),
            enrolled: source.enrolledStageIds?.has(stage.id) ?? false,
            ...parentIdOf(stage),
            ...(stage.iconPath ? { icon_path: stage.iconPath } : {}),
            ...(state === "locked"
              ? { lock_reasons: maskedLockReasons(source, result, stage.id, true) }
              : {}),
            ...(state !== "locked" && stage.canDo ? { can_do: stage.canDo } : {}),
          },
        ];
      }

      // 3 歩先: 線を引くためのトポロジだけ。名前もテーマも出さない (画面は星を描かず、
      // 手前の星から伸びる線を薄くフェードさせるだけ)。距離 1 以上は必ず locked なので、
      // 状態を載せても何も明かさない。
      if (!isStarVisible(visibility)) {
        return [{ ...base, category: stage.category, ...parentIdOf(stage) }];
      }

      // 2 歩先 (霧): 名前とカテゴリと前提の線まで (画面は名前をぼかして「予告」)。
      // slug・到達説明・解放条件・受講登録・アイコンはここで止める。
      if (visibility === "fog") {
        return [
          {
            ...base,
            theme: fogNameOf(stage.id),
            title: stage.title,
            category: stage.category,
            ...parentIdOf(stage),
          },
        ];
      }

      // 0〜1 歩 (full): 名前・受講登録・アイコンまで。ロック星は解放条件、
      // 開いている星は到達説明。
      return [
        {
          ...base,
          slug: stage.slug,
          title: stage.title,
          category: stage.category,
          ...(stage.theme ? { theme: stage.theme } : {}),
          enrolled: source.enrolledStageIds?.has(stage.id) ?? false,
          ...parentIdOf(stage),
          ...(stage.iconPath ? { icon_path: stage.iconPath } : {}),
          ...(state === "locked"
            ? { lock_reasons: maskedLockReasons(source, result, stage.id) }
            : {}),
          ...(state !== "locked" && stage.canDo ? { can_do: stage.canDo } : {}),
        },
      ];
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
        /**
         * 受講登録が 1 つでもあるか。
         *
         * ホームのプレースメント (`LearnerDashboard`) は「受講登録が 0 件か」で出すが、
         * 星ごとの `enrolled` は霧より先に出さない — 数え上げを星の配列に頼ると、
         * 唯一の登録が 2 歩先にある受講者を「まだ何も始めていない」と誤判定する。
         * どの星かは伏せたまま、有無だけを集約して返す。
         */
        has_enrollment: (source.enrolledStageIds?.size ?? 0) > 0,
        /**
         * 配信対象のステージ総数 (視界で落とす前)。盤面の「修了 x / y」の分母。
         *
         * `stages` の長さを分母にすると、先へ進むほど星が増えて分母も増え、
         * 「全体のどこまで来たか」が読めなくなる。
         */
        stage_count: source.stages.length,
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
 * **霧より先の星も選ばせない** (下の秘匿の理由を参照)。
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
      // 霧より先の星を自分で active にすると、その星と隣接が即 full になり、視界制限が
      // 受講者の操作で無効化される。割当済みなのに霧の彼方にある稀なケースは、
      // 前提を進めれば自然に見えてくるので、ここで閉じる方を採る。
      // 文言は未受講 / 存在しないときと同じ — 400 の出方から「割り当てられてはいる」
      // ことを読み取れると、霧の中に星があること自体を漏らすため。
      if (!isSelectableVisibility(result.visibility.get(stageId) ?? "hidden")) {
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
