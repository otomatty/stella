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
 *   黙って次のステージの一覧へ進むと、提出の確認が残っていることに気付けない
 * - **始められるステージの一覧はレッスンが無いときだけ**。進めるステージは同時に 1 つという設計
 *   なので、続きがあるうちは別の星を並べて迷わせない
 * - 何も始めていない人には、初回の案内が **最初の一手** (先頭) になる
 * - 一覧はサーバの順 (`next_stage_ids`) のうち、名前が見えていて今すぐ始められる
 *   星だけ。秘匿の判断はサーバの応答 (`visibility` / `state`) をそのまま使う
 * - **特定の星を名指ししない。** 一覧は Basic と Extra に分けて同列に出す。
 *   Extra は講師・管理者が割り当てたステージだけ。例外として受講登録が 0 件で、
 *   始められる星が Basic の 1 つだけ (盤面に出ている Extra が無い) の初回は、その星を名指しして始める。
 *   島の表示条件で盤面に出ていない Extra は数えず、その人には Basic の入口を案内する。
 *   最初の一手で迷わせず、Extra がある人には特定の Basic を勧めない (06 §11.1)
 */

import type { SkillMapStageNode } from "@/lib/skill-map-api";
import type { TodayPlan, TodayPlanItem } from "@/lib/today-plan";

export type GuideStep =
  | { kind: "setup-vscode" }
  /** 初回に始められる星が Basic の 1 つだけ — その場で始める。 */
  | { kind: "first-stage"; stageId: string }
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
  /** 状態を問わず、盤面に Extra の星が 1 つでもあるか。 */
  hasVisibleExtra: boolean;
  /** 進行中のステージがあり、未修了なのに開けるレッスンが残っていない。 */
  activeWithoutLesson: boolean;
  /** 今すぐ始められる星 (`startableStageIds` の戻り値)。 */
  startableStageIds: string[];
  /** 星の audience。未指定は Basic として扱う。 */
  stageAudienceById: Readonly<Record<string, SkillMapStageNode["audience"]>>;
  /** 今日の復習を解き終えたか。 */
  reviewDone: boolean;
  /** 到達リストの取得前・失敗時は undefined (準備案内を出さない)。 */
  connectedVscode?: boolean;
  firstStageStarted?: boolean;
}

/**
 * 始められる星。サーバの順 (`next_stage_ids`) のうち、名前が見えていて解放済みの星だけを順に返す。
 * 進行中の星は入れない (それは「続きから」の役目)。霧の星・ロック星も入れない —
 * 押しても始められないため。
 */
export function startableStageIds(
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
  }
  return picked;
}

export function buildHomeGuide(input: HomeGuideInput): HomeGuide {
  const steps: GuideStep[] = input.plan.items.map((item) => ({ kind: "plan", item }));
  if (input.activeWithoutLesson) steps.push({ kind: "wrapup" });

  const hasLesson = input.plan.items.some((item) => item.kind === "lesson");
  const stageIds = input.startableStageIds;
  if (!hasLesson && stageIds.length > 0) {
    if (input.hasEnrollment) {
      steps.push({ kind: "choose", welcome: false, stageIds });
    } else {
      if (
        !input.hasVisibleExtra &&
        stageIds.length === 1 &&
        input.stageAudienceById[stageIds[0]] !== "granted"
      ) {
        steps.unshift({ kind: "first-stage", stageId: stageIds[0] });
      } else {
        steps.unshift({ kind: "choose", welcome: true, stageIds });
      }
    }
  }

  if (input.hasEnrollment && input.connectedVscode === false && input.firstStageStarted === false) {
    // 今日の先頭を保ち、「そのあと」の先頭へ。他の手順も無ければ案内を先頭にする。
    steps.splice(Math.min(1, steps.length), 0, { kind: "setup-vscode" });
  }

  return { steps, idle: input.reviewDone ? "done" : "empty" };
}
