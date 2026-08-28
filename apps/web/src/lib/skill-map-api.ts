/**
 * スキルマップ (ステージの道) / スキルプロフィール / 「次にやるリスト」の
 * データアクセス層 (Phase 2)。
 *
 * **秘匿はサーバ側で済んでいる。** 霧の星にはタイトルも slug も入っていないので、
 * 画面はここで受け取った形をそのまま描けばよい (クライアントで伏せ直さない)。
 */

import type { SkillMapState, SkillMapVisibility } from "@falcon/shared/skill-map/evaluate";

import { apiFetch } from "./api-client";

export type { SkillMapState, SkillMapVisibility };

/** 道の上の星 1 つ。視界に応じて欠ける項目がある。 */
export interface SkillMapStageNode {
  id: string;
  state: SkillMapState;
  visibility: SkillMapVisibility;
  slug?: string;
  title?: string;
  category?: string;
  /** 霧の中で見える唯一の手がかり (テーマ名 / 伏せ字)。 */
  theme?: string;
  can_do?: string;
  lock_reasons?: string[];
  enrolled?: boolean;
  /**
   * 前提ステージの id (スキルツリーが星と星を線で結ぶのに使う)。
   *
   * 霧の星には付かない (サーバが落としている)。線を引く / 引かないの判断も
   * この項目の有無に従うだけで、こちらで「霧だから隠す」を足さない。
   */
  prerequisite_ids?: string[];
}

/** 集中ボーナス (表示専用の係数。XP の保存値は動かさない)。 */
export interface FocusBonusPayload {
  streak_days: number;
  multiplier: number;
  next_tier_days: number | null;
  next_multiplier: number | null;
}

/**
 * 道の脇に灯る発見教材 (Phase 4)。
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
  focus_bonus: FocusBonusPayload;
  generated_at: string;
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

export async function getSkillMap(): Promise<SkillMapMine> {
  const { skill_map } = await apiFetch<{ skill_map: SkillMapMine }>("/api/skill-map/mine");
  return skill_map;
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
