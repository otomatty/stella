/** AI の判定に、根拠の検証・しきい値・解答例の照合を当てる純粋な処理。 */
import {
  type AiFinding,
  type AiLearnerReply,
  type AiReviewOutput,
  decideRouting,
  isEvidenceKind,
  type LearnerAiFeedback,
  type LineCounts,
  type ReviewRubricItem,
  type RouteReason,
  type RoutingDecision,
} from "@stella/shared/review/ai-review";
import { checkSolutionLeak, type SolutionLeakResult } from "@stella/shared/review/solution-leak";
import type { LoadedMaterial } from "./ai-review-material.js";

/** 練習で返信が解答例と重なったときに、受講者へ代わりに返す文。 */
const SAFE_REPLY: AiLearnerReply = {
  message: "提出を確認しました。気になる点があれば、講師への相談から質問してください。",
  goodPoints: [],
  nextSteps: [],
};

/** 判定と解答例の照合に使う教材の部分 (候補の当て直しでは手元のファイルに控える)。 */
export interface AiReviewJudgeMaterial {
  rubric: ReviewRubricItem[];
  escalateWhen: string[];
  /** 解答例のファイルの本文。 */
  solution: string[];
  /** 受講者がすでに持っている本文 (提出と配布物)。照合で除く。 */
  known: string[];
}

export function judgeMaterialOf(loaded: LoadedMaterial): AiReviewJudgeMaterial {
  return {
    rubric: loaded.material.rubric,
    escalateWhen: loaded.escalateWhen,
    solution: loaded.material.solution.map((f) => f.text),
    known: loaded.known,
  };
}

export interface AiReviewJudgement {
  decision: RoutingDecision;
  leak: SolutionLeakResult | null;
  /** `ai_reviews.leak_check` に残す形。 */
  leakCheck: (SolutionLeakResult & { action: "none" | "escalate" | "sanitize" }) | null;
  /** 受講者に見せる返信と所見 (AI が判定できなかったときは null)。 */
  learnerReply: LearnerAiFeedback | null;
}

/**
 * AI の結果に、解答例の照合としきい値をコードで当てる (07 §6.3)。本番の `runAiReview` と、
 * 候補の当て直し (`scripts/ai-review-replay.ts`) が同じ関数で判定する。
 */
export function judgeAiReview(input: {
  kind: string;
  /** 教材を読めなかったときは null。 */
  material: AiReviewJudgeMaterial | null;
  forced: RouteReason[];
  /** AI が判定できなかったときは null。 */
  output: AiReviewOutput | null;
  lines: LineCounts;
}): AiReviewJudgement {
  const { kind, material, output } = input;
  // 受講者に見せうる文 (返信と所見のコメント) を解答例と照合する。
  const strict = isEvidenceKind(kind);
  const visible: string[] = output
    ? [
        output.learnerReply.message,
        ...output.learnerReply.goodPoints,
        ...output.learnerReply.nextSteps,
        ...output.findings.map((f) => f.comment),
      ]
    : [];
  const leak =
    output && material
      ? checkSolutionLeak({
          texts: visible,
          solution: material.solution,
          known: material.known,
          strict,
        })
      : null;
  const leaked = (leak?.hits.length ?? 0) > 0;
  const decision = decideRouting({
    kind,
    rubric: material?.rubric ?? [],
    escalateWhen: material?.escalateWhen ?? [],
    forced: input.forced,
    output,
    lines: input.lines,
    // 確認A・B (と統合) は返信が重なったら人に回す。練習は返信だけを差し替えて確定してよい。
    leakEscalates: leaked && strict,
  });
  let learnerReply: LearnerAiFeedback | null = null;
  if (output) {
    const replyCount =
      1 + output.learnerReply.goodPoints.length + output.learnerReply.nextSteps.length;
    const replyLeaked = (leak?.hits ?? []).some((i) => i < replyCount);
    // 受講者に見せる所見は、箇所が提出に実在し (根拠と同じ `lines` で確かめる)、解答例とも
    // 重ならないものだけ。AI の原文 (`findings`) は評価と講師の確認のためにそのまま記録する。
    const findings: AiFinding[] = output.findings.filter(
      (_, i) => decision.findingsValid[i] === true && !(leak?.hits ?? []).includes(replyCount + i),
    );
    learnerReply = { ...(replyLeaked ? SAFE_REPLY : output.learnerReply), findings };
  }
  return {
    decision,
    leak,
    leakCheck: leak
      ? { ...leak, action: !leaked ? "none" : strict ? "escalate" : "sanitize" }
      : null,
    learnerReply,
  };
}
