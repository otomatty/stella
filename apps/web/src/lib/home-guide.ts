/**
 * ホームのガイド (スキルツリーの脇の「次にやること」) の組み立て — 純関数 (I/O を持たない)。
 *
 * ホームはスキルツリーそのもので、ガイドはその横に **今日の手順を上から 1 本** で並べる。
 * 先頭の 1 つ (`steps[0]`) が画面でいちばん大きく出る「次にやること」で、残りは
 * 「そのあと」として小さく続く。何をどの順に出すかはここだけが決める (画面に条件を
 * 散らすと、「続きから」がガイドとツリーの両方で別の星を指す類のずれが出る)。
 *
 * ## 決めたこと
 *
 * - **今日のプラン (`buildTodayPlan`) が先**。復習 → 続きのレッスン → つまずきの見直しは
 *   そちらで並べ、ここは順番を崩さない
 * - 進行中のステージのレッスンが尽きた (課題・レビュー待ち) ときは「仕上げ」を足す。
 *   黙って次の星を勧めると、提出の確認が残っていることに気付けない
 * - **次の星の提案はレッスンが無いときだけ**。進めるステージは同時に 1 つという設計
 *   なので、続きがあるうちは別の星を並べて迷わせない
 * - 何も始めていない人には、提案が **最初の一手** (先頭) になる
 * - 提案はサーバの推奨順 (`next_stage_ids`) のうち、名前が見えていて今すぐ始められる
 *   星だけ。秘匿の判断はサーバの応答 (`visibility` / `state`) をそのまま使う
 */

import type { SkillMapStageNode } from "@/lib/skill-map-api";
import type { TodayPlan, TodayPlanItem } from "@/lib/today-plan";

/** 一度に勧める星の数。多いと「選べない」ので、推奨順の上位だけに絞る。 */
export const GUIDE_MAX_SUGGESTIONS = 3;

export type GuideStep =
  /** 今日のプランの 1 項目 (復習 / 続きのレッスン / つまずきの見直し)。 */
  | { kind: "plan"; item: TodayPlanItem }
  /** 進行中のステージのレッスンが尽きた — 課題とレビューの状況を確かめる。 */
  | { kind: "wrapup" }
  /** 次に始める星を選ぶ。`welcome` は何も始めていない人への最初の案内。 */
  | { kind: "choose"; welcome: boolean; stageIds: string[] };

export interface HomeGuide {
  /** 上から順にやること。先頭が「次にやること」。 */
  steps: GuideStep[];
  /** `steps` が空のときの言い分け (今日のぶんは終えた / 始められるものが無い)。 */
  idle: "done" | "empty";
}

export interface HomeGuideInput {
  plan: TodayPlan;
  /** 受講登録が 1 件でもあるか (サーバの集約フラグ)。 */
  hasEnrollment: boolean;
  /** 進行中のステージがあり、未修了なのに開けるレッスンが残っていない。 */
  activeWithoutLesson: boolean;
  /** 今すぐ始められる推奨の星 (`suggestedStageIds` の戻り値)。 */
  suggestedStageIds: string[];
  /** 今日の復習を解き終えたか。 */
  reviewDone: boolean;
}

/**
 * 勧めてよい星。サーバの推奨順のうち、名前が見えていて解放済みの星だけを順に返す。
 *
 * 進行中の星は勧めない (それは「続きから」の役目)。霧の星・ロック星も候補にしない —
 * 押しても始められない星を「次はこれ」と言わないため。
 */
export function suggestedStageIds(
  nodes: SkillMapStageNode[],
  nextStageIds: string[],
  activeStageId: string | null,
): string[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const picked: string[] = [];
  for (const id of nextStageIds) {
    if (id === activeStageId || picked.includes(id)) continue;
    const node = byId.get(id);
    if (node?.visibility !== "full" || node.state !== "unlocked" || !node.title) continue;
    picked.push(id);
    if (picked.length >= GUIDE_MAX_SUGGESTIONS) break;
  }
  return picked;
}

export function buildHomeGuide(input: HomeGuideInput): HomeGuide {
  const steps: GuideStep[] = input.plan.items.map((item) => ({ kind: "plan", item }));
  if (input.activeWithoutLesson) steps.push({ kind: "wrapup" });

  const hasLesson = input.plan.items.some((item) => item.kind === "lesson");
  const stageIds = input.suggestedStageIds.slice(0, GUIDE_MAX_SUGGESTIONS);
  if (!hasLesson && stageIds.length > 0) {
    if (input.hasEnrollment) {
      steps.push({ kind: "choose", welcome: false, stageIds });
    } else {
      steps.unshift({ kind: "choose", welcome: true, stageIds });
    }
  }

  return { steps, idle: input.reviewDone ? "done" : "empty" };
}
