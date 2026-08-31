/**
 * スキルマップ / スキルプロフィール / 「次にやるリスト」の
 * データアクセス層 (Phase 2)。
 *
 * **秘匿はサーバ側で済んでいる。** 霧の星には slug も解放条件も入っておらず、3 歩先
 * (`edge`) には名前すら無く、4 歩以上先は配列に現れない。画面はここで受け取った形を
 * そのまま描けばよい (クライアントで伏せ直さない)。段の仕様は
 * `docs/superpowers/specs/2026-08-30-skill-tree-fog-display-design.md`。
 */

import type { StageClearedNotice } from "@falcon/shared/cms/types";
import type { SkillMapState, SkillMapVisibility } from "@falcon/shared/skill-map/evaluate";

import { apiFetch } from "./api-client";
import { emitStageCleared, toStageClearedEvents } from "./stage-clear-events";

export type { SkillMapState, SkillMapVisibility };

/** スキルマップの星 1 つ。視界に応じて欠ける項目がある。 */
export interface SkillMapStageNode {
  id: string;
  state: SkillMapState;
  visibility: SkillMapVisibility;
  slug?: string;
  /** 霧の星にも入る (画面はぼかして「予告」として出す)。`edge` には入らない。 */
  title?: string;
  /** 扇 (ルート / 島) の名前。`edge` の幽霊ノードにも入る (線の向きが決まらないため)。 */
  category?: string;
  /** テーマ名 (カテゴリ相当の粗い括り)。霧の星のラベルのフォールバック。 */
  theme?: string;
  /**
   * 講座アイコンがあるか。霧の外の星にだけ入る (アイコンの形は正体を語るので、
   * サーバが slug と同じ秘匿ルールで伏せる)。実体は
   * `GET /api/skill-map/icons` (JWT)。R2 キーはクライアントに出ない。
   * 画面は blob URL を CSS mask + currentColor で塗る。
   */
  has_icon?: true;
  can_do?: string;
  lock_reasons?: string[];
  enrolled?: boolean;
  /**
   * 線を引く親ステージの id (スキルツリーが星と星を線で結び、深さ = リングを決めるのに使う)。
   * 線は 1 本だけ。解放条件 (前提 AND) は `lock_reasons` が名前で持つ。
   *
   * 霧の星にも入る (線が無いと先のスキルが内側のリングに置かれてしまうため)。
   * 見せる / 伏せるの判断はサーバの応答に従うだけで、こちらで足し引きしない。
   */
  parent_id?: string;
  /**
   * 同じステージを複数の扇に置くときの扇名。実体は 1 つ (クリアは共有)。
   * 霧の星にも入る (slug が無くてもレイアウトが複製できる)。
   */
  appearances?: string[];
  /**
   * 扇ごとの親ステージ id。複製した星は、自分の扇の親から線を引き、鍵もそれで見る。
   * **霧の星にも付ける。** 線が無いとリングが崩れるのは `parent_id` と同じ。
   */
  appearance_parent_ids?: Record<string, string>;
}

/** 集中ボーナス (表示専用の係数。XP の保存値は動かさない)。 */
export interface FocusBonusPayload {
  streak_days: number;
  multiplier: number;
  next_tier_days: number | null;
  next_multiplier: number | null;
}

/**
 * スキルマップの脇に灯る発見教材 (Phase 4)。
 *
 * **サーバが公開条件で絞ったあとの配列** — 源流ステージが進行中 / クリア済みの、
 * 講師が承認した教材だけが入る。ロック中や霧の星の教材はそもそも配列に現れないので、
 * 画面側で「見せてよいか」を判断し直さない。
 */
export interface DiscoveryNode {
  id: string;
  stage_id: string;
  title: string;
  description: string;
  question_count: number;
  /** 本人が既に合格したか。 */
  passed: boolean;
}

export interface SkillMapMine {
  stages: SkillMapStageNode[];
  /** 発見教材。バックエンドが古い場合に備えて省略可 (無ければ描かない)。 */
  discoveries?: DiscoveryNode[];
  next_stage_ids: string[];
  active_stage_id: string | null;
  /** `chosen` = 受講者が選んだ / `derived` = 直近の進捗から導出。 */
  active_stage_source: "chosen" | "derived";
  cleared_count: number;
  /**
   * 受講登録が 1 つでもあるか (どの星かは伏せたまま)。
   *
   * 星ごとの `enrolled` は霧より先に付かないので、プレースメントの「まだ何も
   * 始めていない」判定を星の配列で数えると、唯一の登録が 2 歩先にある受講者を
   * 取りこぼす。古いバックエンドでは省略されるので、その場合だけ星から数える。
   */
  has_enrollment?: boolean;
  /**
   * 配信対象のステージ総数 (視界で落とす前)。「修了 x / y」の分母。
   * 古いバックエンドを踏んだときは `stages.length` に落とす。
   */
  stage_count?: number;
  focus_bonus: FocusBonusPayload;
  generated_at: string;
  /** サーバの `DEV_MODE` が立っているか。FAB を出す判定。 */
  dev_mode_available?: boolean;
  /**
   * この応答が開発者表示か (島全配信 + 段を素通し)。
   *
   * **ぼかしを外してよいかはこの値で決める** — クライアントの localStorage だけで
   * 判断すると、`DEV_MODE` の無い本番でもぼかしが外れる (Issue #271)。
   */
  dev_mode?: boolean;
}

export interface SkillProfileMine {
  xp: {
    total: number;
    completed_lessons: number;
    passed_quizzes: number;
    cleared_stages: number;
    passed_discoveries?: number;
    from_lessons: number;
    from_quizzes: number;
    from_stages: number;
    from_discoveries?: number;
  };
  level: {
    level: number;
    xp_into_level: number;
    xp_to_next_level: number;
    next_level_at: number;
  };
  streak: { current: number; longest: number; today: string };
  generated_at: string;
}

export interface StageQueueEntry {
  stage_id: string;
  order: number;
  added_at: string;
}

/** `POST /api/stages/:id/start` の応答。 */
export interface StartStageResult {
  /** この呼び出しで登録が生まれたか (既に始めていた星なら false)。 */
  created: boolean;
  /** 開始時点の星の状態 (`unlocked` = 新しく始めた / `active` = 再開)。 */
  state: "unlocked" | "active";
}

/**
 * ステージを **自分で始める** (Phase 3b)。
 *
 * 受講登録を作るのはこの 1 本だけ (管理者の割当は廃止)。開始してよい星かはサーバの
 * 評価器が決めるので、画面側は「解放されている星なら押せる」だけを描き、ロック /
 * クリア済み / 霧の断り方はサーバのメッセージをそのまま出す。
 *
 * **冪等** — 既に始めている星に投げても 200 (`created: false`) が返る。
 */
export async function startStage(stageId: string): Promise<StartStageResult> {
  const res = await apiFetch<StartStageResult>(`/api/stages/${encodeURIComponent(stageId)}/start`, {
    method: "POST",
  });
  return { created: res.created, state: res.state };
}

/**
 * この画面が扱える視界の段の版 (API 側は `SKILL_MAP_TIERS_PARAM`)。
 *
 * `2` = `full` / `fog` / `edge` / `hidden` の 4 段を描ける。申告しない画面
 * (デプロイ途中の旧 bundle・開いたままの古いタブ) に、API は幽霊ノード (`edge`) を
 * 配らない — 旧 `describeStar()` はそれを普通のロック星として描き、必ず 400 になる
 * 腕試しボタンまで出してしまうため。
 *
 * **ヘッダではなくクエリ引数**にしてある。独自ヘッダはサーバの CORS 許可リストに
 * 無いとプリフライトで弾かれ、API をロールバックした瞬間に全ての API 呼び出しが
 * 落ちる。クエリ引数なら CORS の対象外で、知らないサーバは黙って無視する。
 */
const SKILL_MAP_TIERS = "2";

export async function getSkillMap(): Promise<SkillMapMine> {
  const { skill_map, cleared_stages } = await apiFetch<{
    skill_map: SkillMapMine;
    cleared_stages?: StageClearedNotice[];
  }>(`/api/skill-map/mine?tiers=${SKILL_MAP_TIERS}`);
  // 入口のバックフィル (達成済み・未発行の自動発行) で新しくクリアになったステージは
  // クリアイベントへ流す。マップ自体はクリア済みで返るが、シェルが持つ受講ステージ
  // 一覧・修了証バッジはイベント経由の取り直しでしか揃わない。
  emitStageCleared(toStageClearedEvents(cleared_stages));
  return skill_map;
}

/**
 * 霧の外の講座アイコン SVG をまとめて取る。呼び出し側が blob URL にして
 * `URL.revokeObjectURL` する。`mask-image` は Authorization を付けられないので、
 * JWT 付きで取ってから同じオリジンの blob を渡す (公開 R2 URL 直だと CORS で
 * マスクが透明になる)。マップ JSON には埋め込まない (ホームが R2 を踏まないため)。
 */
export async function getSkillMapIcons(signal?: AbortSignal): Promise<Record<string, string>> {
  const res = await apiFetch<{ icons: Record<string, string> }>("/api/skill-map/icons", {
    signal,
  });
  return res.icons;
}

export async function getSkillProfile(): Promise<SkillProfileMine> {
  const { skill_profile } = await apiFetch<{ skill_profile: SkillProfileMine }>(
    "/api/skill-profile/mine",
  );
  return skill_profile;
}

/** いま進める星を 1 つに決める (`null` で解除)。受講登録のある星のみ。 */
export async function putActiveStage(stageId: string | null): Promise<string | null> {
  const res = await apiFetch<{ active_stage_id: string | null }>("/api/skill-map/active-stage", {
    method: "PUT",
    body: { stageId },
  });
  return res.active_stage_id;
}

export async function getStageQueue(): Promise<StageQueueEntry[]> {
  const { stage_queue } = await apiFetch<{ stage_queue: StageQueueEntry[] }>(
    "/api/stage-queue/mine",
  );
  return stage_queue ?? [];
}

export async function addToStageQueue(stageId: string): Promise<StageQueueEntry[]> {
  const { stage_queue } = await apiFetch<{ stage_queue: StageQueueEntry[] }>(
    "/api/stage-queue/mine",
    { method: "POST", body: { stageId } },
  );
  return stage_queue ?? [];
}

export async function removeFromStageQueue(stageId: string): Promise<StageQueueEntry[]> {
  const { stage_queue } = await apiFetch<{ stage_queue: StageQueueEntry[] }>(
    `/api/stage-queue/mine/${encodeURIComponent(stageId)}`,
    { method: "DELETE" },
  );
  return stage_queue ?? [];
}

export async function reorderStageQueue(stageIds: string[]): Promise<StageQueueEntry[]> {
  const { stage_queue } = await apiFetch<{ stage_queue: StageQueueEntry[] }>(
    "/api/stage-queue/mine/order",
    { method: "PUT", body: { stageIds } },
  );
  return stage_queue ?? [];
}
