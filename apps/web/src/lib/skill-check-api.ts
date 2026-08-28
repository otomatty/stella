/**
 * 腕試し (SkillCheck) のデータアクセス層 (Phase 3a)。
 *
 * 出題も採点もサーバ側。**正答・解説は応答に入っていない** ので、画面は受け取った
 * 得点と合否をそのまま出す (自前で答え合わせをしない)。
 */

import type { SkillMapState, SkillMapVisibility } from "@/lib/skill-map-api";

import { apiFetch } from "./api-client";

export type SkillCheckQuestionKind = "single" | "multiple" | "boolean";

export interface SkillCheckQuestion {
  id: string;
  kind: SkillCheckQuestionKind;
  prompt: string;
  points: number;
  options: { id: string; label: string }[];
}

export interface SkillCheckHistory {
  attempt_count: number;
  passed: boolean;
  last_score: number | null;
  last_max_score: number | null;
  last_attempt_at: string | null;
}

/** 出題 (`supported: false` のときは設問が足りず腕試しを組めないステージ)。 */
export interface SkillCheckPaper {
  stage_id: string;
  title?: string;
  state: SkillMapState;
  visibility: SkillMapVisibility;
  supported: boolean;
  /** `supported: false` のときだけ入る理由コード。 */
  unsupported_reason?: string;
  min_questions?: number;
  pass_score?: number;
  /** ロック星の腕試し = 飛び級。合格すればその星が開く。 */
  test_out?: boolean;
  /** 同じ星を 1 日に受けられる回数 (サーバ側の上限)。 */
  daily_limit?: number;
  attempts_today?: number;
  /** この受験票が何回目のものか。提出時にそのまま送り返す (見た問題で採点させる)。 */
  attempt?: number;
  /** 今日あと何回受けられるか。0 なら送っても 429 になる。 */
  remaining_today?: number;
  questions?: SkillCheckQuestion[];
  history?: SkillCheckHistory;
}

export interface SkillCheckResult {
  stage_id: string;
  title: string;
  score: number;
  max_score: number;
  percent: number;
  pass_score: number;
  passed: boolean;
  /** 飛び級で新しく星が開いたか。 */
  unlocked: boolean;
  /**
   * 合格したのに解放を記録できなかったときだけ入る文言 (再挑戦の案内)。
   * サーバは同時に `unlocked: false` を返す — 開いていないものを開いたと言わない。
   */
  unlock_error?: string;
  /** 合格したときだけ入る到達説明。 */
  can_do?: string;
}

export interface SkillCheckAnswer {
  question_id: string;
  selected_option_ids: string[];
}

export async function getSkillCheck(stageId: string): Promise<SkillCheckPaper> {
  const { skill_check } = await apiFetch<{ skill_check: SkillCheckPaper }>(
    `/api/skill-check/${encodeURIComponent(stageId)}`,
  );
  return skill_check;
}

export async function submitSkillCheck(
  stageId: string,
  answers: SkillCheckAnswer[],
  attempt?: number,
): Promise<SkillCheckResult> {
  const { result } = await apiFetch<{ result: SkillCheckResult }>(
    `/api/skill-check/${encodeURIComponent(stageId)}`,
    { method: "POST", body: { answers, ...(attempt === undefined ? {} : { attempt }) } },
  );
  return result;
}
