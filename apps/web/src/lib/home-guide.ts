/**
 * ホームのガイド (ステージ一覧の「次にやること」) の組み立て — 純関数 (I/O を持たない)。
 *
 * ガイドはステージ一覧の盤面に重なる「次にやること」のカードに、今日の手順を上から並べる。
 * 先頭の 1 つ (`steps[0]`) を大きく出し、残りは「そのあと」として続く。
 *
 * ## 決めたこと
 *
 * - **今日のプラン (`buildTodayPlan`) が先**。復習 → 続きのレッスン → つまずきの見直しは
 *   そちらで並べ、ここは順番を崩さない
 * - 進行中のステージのレッスンが尽きた (課題・レビュー待ち) ときは「仕上げ」を足す。
 *   黙って次のステージの一覧へ進むと、提出の確認が残っていることに気付けない
 * - 通常の現在地に続きのレッスンがあれば、始められるステージの一覧は出さない。
 *   案内から選んだ星の続きには、通常の手順をあとに残す。
 * - 何も始めていない人には、初回の案内が **最初の一手** になる。案内されたステージを
 *   ガイドに出す日は、そのステージの手順のあとに初回・ツリー選択・VS Code 準備を残す。
 * - 通常の道は `unguided_next_stage_ids` / `has_unguided_enrollment` で決める。
 *   割り当ては一覧にも初回の名指しの判定にも数えない。
 *   割り当てのない受講がなく、始められる Basic が 1 つなら、その星を名指しする。
 * - サーバの現在地が null なら、案内から進行中 → 始められる → 期限順で 1 件選ぶ
 *   (期限なしは最後、同順は API 順)。進行中はガイドの続き・仕上げに使い、
 *   始められる星は続きのレッスンと同じ位置に置く。開始・表示でフォーカスは変えない (06 §11.1)。
 * - 古い API の応答では従来の項目で判断する。
 */

import type { GuidedStage } from "@stella/shared/stage-grants/types";
import type { SkillMapMine, SkillMapStageNode } from "@/lib/skill-map-api";
import type { TodayPlan, TodayPlanItem } from "@/lib/today-plan";

export type GuideStep =
  | { kind: "setup-vscode" }
  /** 初回に始められる星が Basic の 1 つだけ — その場で始める。 */
  | { kind: "first-stage"; stageId: string }
  | { kind: "start-guided"; stage: GuidedStage }
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
  /** 通常の道の判定用。割り当てのないステージの受講登録があるか。 */
  hasEnrollment: boolean;
  /** 準備案内用。割り当ても含めた全受講登録。省略時は従来どおり hasEnrollment。 */
  hasAnyEnrollment?: boolean;
  /** 古い API の互換判定。新しい応答では通常の一覧から割り当てを除くため false。 */
  hasVisibleExtra: boolean;
  /** 進行中のステージがあり、未修了なのに開けるレッスンが残っていない。 */
  activeWithoutLesson: boolean;
  /** 案内から選んだ星。進行中の星は本人の受講一覧にあるときだけ渡す。 */
  guidedStage?: GuidedStage;
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

/** 現在地が確定していない間や、本人の現在地があるときは案内へ切り替えない。 */
export function pickGuidedStage(
  stages: readonly GuidedStage[],
  activeStageId: string | null | undefined,
): GuidedStage | undefined {
  if (activeStageId !== null) return undefined;
  let picked: GuidedStage | undefined;
  let pickedDeadline = Infinity;
  for (const stage of stages) {
    if (stage.status !== "available" && stage.status !== "in-progress") continue;
    const deadline = stage.due_at ? Date.parse(stage.due_at) : Infinity;
    if (
      !picked ||
      (picked.status === "available" && stage.status === "in-progress") ||
      (picked.status === stage.status && deadline < pickedDeadline)
    ) {
      picked = stage;
      pickedDeadline = deadline;
    }
  }
  return picked;
}

export function isGuidedStageStep(step: GuideStep | undefined, stage: GuidedStage): boolean {
  return (
    (step?.kind === "start-guided" && step.stage.stage_id === stage.stage_id) ||
    (stage.status === "in-progress" &&
      (step?.kind === "wrapup" || (step?.kind === "plan" && step.item.kind === "lesson")))
  );
}

export function buildHomeGuide(input: HomeGuideInput): HomeGuide {
  const steps: GuideStep[] = input.plan.items.map((item) => ({ kind: "plan", item }));
  if (input.activeWithoutLesson) steps.push({ kind: "wrapup" });

  const guidedStage = input.guidedStage;
  if (guidedStage?.status === "available") {
    steps.splice(input.plan.items[0]?.kind === "review" ? 1 : 0, 0, {
      kind: "start-guided",
      stage: guidedStage,
    });
  }
  const guidedIndex = guidedStage
    ? steps.findIndex((step) => isGuidedStageStep(step, guidedStage))
    : -1;
  const hasLesson = input.plan.items.some((item) => item.kind === "lesson");
  const stageIds = input.startableStageIds;
  if ((!hasLesson || guidedIndex >= 0) && stageIds.length > 0) {
    // 本人が案内された星をフォーカスに選んだ場合も、仕上げを先頭に保つ。
    if (input.hasEnrollment || (input.activeWithoutLesson && guidedIndex < 0)) {
      steps.push({ kind: "choose", welcome: false, stageIds });
    } else {
      const step: GuideStep =
        !input.hasVisibleExtra &&
        stageIds.length === 1 &&
        input.stageAudienceById[stageIds[0]] !== "granted"
          ? { kind: "first-stage", stageId: stageIds[0] }
          : { kind: "choose", welcome: true, stageIds };
      if (guidedIndex >= 0) steps.push(step);
      else steps.unshift(step);
    }
  }

  if (
    (input.hasAnyEnrollment ?? input.hasEnrollment) &&
    input.connectedVscode === false &&
    input.firstStageStarted === false
  ) {
    // 今日の先頭と案内された星の手順のあとへ。他の手順が無ければ先頭にする。
    steps.splice(Math.min(Math.max(1, guidedIndex + 1), steps.length), 0, { kind: "setup-vscode" });
  }

  return { steps, idle: input.reviewDone ? "done" : "empty" };
}

/** 第1段の集約値をホームの入力へ。古い API では従来の振る舞いを保つ。 */
export function homeGuideStageInput(map: SkillMapMine | null, nodes: SkillMapStageNode[]) {
  return {
    hasEnrollment:
      map?.has_unguided_enrollment ??
      map?.has_enrollment ??
      nodes.some((node) => node.enrolled === true),
    hasVisibleExtra:
      map?.unguided_next_stage_ids === undefined &&
      nodes.some((node) => node.audience === "granted"),
    startableStageIds: startableStageIds(
      nodes,
      map?.unguided_next_stage_ids ?? map?.next_stage_ids ?? [],
      map?.active_stage_id ?? null,
    ),
  };
}
