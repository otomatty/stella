/**
 * 提出の AI 一次レビュー (Issue #33、docs/curriculum/07 §6.2〜§6.7)。
 *
 * 1. 提出・課題・コーディング規則・解答例を集めて、構造化出力で AI に判定させる。
 * 2. 返ってきた結果に、しきい値をコードで当てて「AI で確定」か「人に回す」かを決める
 *    (`decideRouting`)。AI が判定できなかったとき (未設定・拒否・時間切れ・形式の誤り) は人に回す。
 * 3. 受講者への返信を解答例と照合する。練習は返信を定型文に差し替え、確認A・Bは人に回す。
 * 4. 結果を `ai_reviews` に残してから、課題のロックの中で提出に当てる。人が先に確定した提出と
 *    新しい提出がある試行には当てない (人の判定が勝つ)。
 *
 * 待ち行列と呼び出し回数の上限は `ai-review-queue.ts`。
 */

import {
  AI_REVIEW_THRESHOLD_VERSION,
  formatLearnerReply,
  forcedHumanReasons,
  ROUTE_REASONS,
  type RouteReason,
  type LearnerAiFeedback,
} from "@stella/shared/review/ai-review";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { aiReviews, sections, submissions, tasks } from "../db/schema.js";
import type { Env } from "../env.js";
import { type AiCallResult, callAiReview } from "./ai-review-completion.js";
import { judgeAiReview, judgeMaterialOf } from "./ai-review-judgement.js";
import { loadMaterial } from "./ai-review-material.js";
import {
  AI_REVIEW_PROMPT_VERSION,
  type BuiltReviewPrompt,
  buildAiReviewPrompt,
  MAX_REVIEW_INPUT_CHARS,
} from "./ai-review-prompt.js";
import type { AiReviewProvider } from "./ai-review-provider.js";
import { ApiError, type Caller } from "./authz.js";
import { autoCompleteStagesIfMet } from "./stage-auto-complete.js";
import {
  AiReviewNeedsHuman,
  AiReviewNotApplicable,
  assessmentRecordedSupport,
  escalateTaskSubmission,
  reviewTaskSubmission,
} from "./task-submission.js";
export { type AiCallResult, interpretAiCompletion } from "./ai-review-completion.js";
export {
  type AiReviewJudgeMaterial,
  type AiReviewJudgement,
  judgeAiReview,
  judgeMaterialOf,
} from "./ai-review-judgement.js";
export { type LoadedMaterial, loadMaterial } from "./ai-review-material.js";

type SubmissionRow = typeof submissions.$inferSelect;

/** AI の判定によらず人に回す条件のうち、提出の行とサーバーの記録で分かるもの。 */
export async function submissionForcedReasons(db: Db, row: SubmissionRow): Promise<RouteReason[]> {
  return forcedHumanReasons({
    kind: row.taskKind ?? "basic",
    mode: row.submissionMode,
    machineCheck: row.machineCheck ?? null,
    support: row.supportLog ?? null,
    recordedSupport: await assessmentRecordedSupport(db, row),
  });
}

export type AiReviewRun =
  | { status: "recorded"; reviewId: string }
  /** 時間切れ・一時的な失敗。待ち行列が時間を空けてやり直す。 */
  | { status: "retry"; detail: string };

/**
 * 1 件の提出を AI にレビューさせ、結果を `ai_reviews` に記録する (提出にはまだ当てない)。
 * `finalAttempt` のときは一時的な失敗でもやり直さず、「AI が判定できなかった」として記録する。
 */
export async function runAiReview(
  env: Env,
  db: Db,
  row: SubmissionRow,
  opts: { timeoutMs: number; finalAttempt: boolean },
): Promise<AiReviewRun> {
  // 教材の読み出しで落ちても (壊れた定義など) やり直さず、AI が判定できなかったとして人に回す。
  const loaded = await loadMaterial(db, env, row).catch((e: unknown) => ({
    failure: "error" as const,
    detail: e instanceof Error ? e.message.slice(0, 500) : "教材を読み出せません",
  }));
  const kind = row.taskKind ?? "basic";
  const forced = await submissionForcedReasons(db, row);
  let call: AiCallResult & { provider?: AiReviewProvider | null };
  let provider: AiReviewProvider | null = null;
  let prompt: BuiltReviewPrompt | null = null;
  if ("failure" in loaded) {
    call = {
      ok: false,
      failure: loaded.failure,
      retryable: false,
      detail: loaded.detail,
      model: null,
    };
  } else {
    prompt = buildAiReviewPrompt(loaded.material);
    call =
      prompt.variableChars > MAX_REVIEW_INPUT_CHARS
        ? {
            ok: false,
            failure: "too-large",
            retryable: false,
            detail: `${prompt.variableChars} chars`,
            model: null,
          }
        : await callAiReview(env, prompt, opts.timeoutMs);
    provider = call.provider ?? null;
  }
  if (!call.ok && call.retryable && !opts.finalAttempt)
    return { status: "retry", detail: `${call.failure}: ${call.detail}` };

  const output = call.ok ? call.output : null;
  const { decision, leakCheck, learnerReply } = judgeAiReview({
    kind,
    material: "failure" in loaded ? null : judgeMaterialOf(loaded),
    forced,
    output,
    lines: prompt?.lines ?? new Map(),
  });
  const [inserted] = await db
    .insert(aiReviews)
    .values({
      submissionId: row.id,
      taskId: row.taskId ?? "",
      taskContentHash: row.taskContentHash ?? "",
      taskKind: kind,
      outcome: decision.outcome,
      routeReasons: decision.reasons,
      confidence: decision.confidence,
      reportedConfidence: output?.confidence ?? null,
      proposedVerdict: decision.proposedVerdict,
      rubricResults: decision.results,
      findings: output?.findings ?? [],
      draftReply: output?.learnerReply ?? null,
      learnerReply,
      leakCheck,
      appliedRules: "failure" in loaded ? [] : loaded.appliedRules,
      ruleSetHash: "failure" in loaded ? null : loaded.ruleSetHash,
      failure: call.ok ? null : call.failure,
      provider,
      model: call.model,
      promptVersion: AI_REVIEW_PROMPT_VERSION,
      thresholdVersion: AI_REVIEW_THRESHOLD_VERSION,
      usage: call.ok ? call.usage : null,
      createdAt: new Date(),
    })
    .returning({ id: aiReviews.id });
  if (!inserted) throw new Error("AI レビューの結果を保存できませんでした");
  return { status: "recorded", reviewId: inserted.id };
}

export type AiReviewApply = "applied" | "superseded" | "busy";

/**
 * 記録した AI の結果を提出に当てる。AI で確定なら人の合格と同じ確定処理 (進捗・スキルの証拠・
 * 通知・確認Bの定着) を通し、ステージの修了も判定する。人に回すなら「講師の確認待ち」にする。
 */
export async function applyAiReview(
  db: Db,
  reviewId: string,
  opts: { lockWaitMs?: number } = {},
): Promise<AiReviewApply> {
  // 人の確定や提出の保存と同じロックを待つ。取れなければ busy を返し、待ち行列が後で当て直す。
  const waitMs = opts.lockWaitMs ?? 5_000;
  const [review] = await db.select().from(aiReviews).where(eq(aiReviews.id, reviewId)).limit(1);
  if (!review) throw new Error("AI レビューの結果が見つかりません");
  if (review.disposition) return review.disposition;
  const [row] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, review.submissionId))
    .limit(1);
  if (!row?.studentId) return "superseded";
  try {
    if (review.outcome === "escalated") {
      await escalateTaskSubmission(db, row.id, review.id, waitMs);
      return "applied";
    }
    // 監査ログの実行者は受講者本人 (役割は system)。合格を確定した講師はいない。
    const system: Caller = {
      id: row.studentId,
      role: "student",
      name: "AI の一次レビュー",
      email: null,
    };
    const notes = review.learnerReply ? formatLearnerReply(review.learnerReply) : "";
    await reviewTaskSubmission(db, system, row.id, "pass", notes, "ai", {
      aiReviewId: review.id,
      waitMs,
    });
    const [task] = await db
      .select({ stageId: sections.stageId })
      .from(tasks)
      .innerJoin(sections, eq(sections.id, tasks.sectionId))
      .where(eq(tasks.id, review.taskId))
      .limit(1);
    if (task)
      await autoCompleteStagesIfMet(db, {
        actor: { ...system, role: "system" },
        userId: row.studentId,
        stageIds: [task.stageId],
      });
    return "applied";
  } catch (e) {
    if (e instanceof AiReviewNotApplicable) return "superseded";
    if (e instanceof AiReviewNeedsHuman) {
      // 記録したあとに人に回す条件に当たった (支援の記録が後から届いた等)。結果を「人に回す」に
      // 切り替えて当てる。ロックを取れなければ次の試行で同じ結果 (人に回す) を当て直す。
      await db
        .update(aiReviews)
        .set({
          outcome: "escalated",
          routeReasons: ROUTE_REASONS.filter(
            (r) => review.routeReasons.includes(r) || e.reasons.includes(r),
          ),
        })
        .where(eq(aiReviews.id, review.id));
      try {
        await escalateTaskSubmission(db, row.id, review.id, waitMs);
        return "applied";
      } catch (inner) {
        if (inner instanceof AiReviewNotApplicable) return "superseded";
        if (inner instanceof ApiError && inner.status === 409) return "busy";
        throw inner;
      }
    }
    if (e instanceof ApiError && e.status === 409) return "busy";
    throw e;
  }
}

/**
 * 想定外の失敗 (例外) が試行回数の上限まで続いた提出を、「AI が判定できなかった」として人に回す。
 * 当てていない AI の結果が残っていれば置き換え済みにし、失敗の記録を足してから当てる。
 * 提出の行は JSON の列を読まずに確かめる (壊れた列があっても記録までは進める)。
 */
export async function escalateUnreviewable(
  db: Db,
  submissionId: string,
  detail: string,
  opts: { lockWaitMs?: number } = {},
): Promise<AiReviewApply> {
  const [row] = await db
    .select({
      id: submissions.id,
      taskId: submissions.taskId,
      taskContentHash: submissions.taskContentHash,
      taskKind: submissions.taskKind,
      aiReviewStatus: submissions.aiReviewStatus,
      verdict: submissions.verdict,
    })
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1);
  if (
    !row?.taskId ||
    row.verdict ||
    (row.aiReviewStatus !== "queued" && row.aiReviewStatus !== "escalated")
  )
    return "superseded";
  const now = new Date();
  await db
    .update(aiReviews)
    .set({ disposition: "superseded", appliedAt: now })
    .where(and(eq(aiReviews.submissionId, row.id), isNull(aiReviews.disposition)));
  const [inserted] = await db
    .insert(aiReviews)
    .values({
      submissionId: row.id,
      taskId: row.taskId,
      taskContentHash: row.taskContentHash ?? "",
      taskKind: row.taskKind ?? "basic",
      outcome: "escalated",
      routeReasons: ["ai-unavailable"],
      failure: "error",
      promptVersion: AI_REVIEW_PROMPT_VERSION,
      thresholdVersion: AI_REVIEW_THRESHOLD_VERSION,
      createdAt: now,
    })
    .returning({ id: aiReviews.id });
  if (!inserted) throw new Error(`AI レビューの失敗を記録できませんでした: ${detail}`);
  try {
    await escalateTaskSubmission(db, row.id, inserted.id, opts.lockWaitMs ?? 5_000);
    return "applied";
  } catch (e) {
    if (e instanceof AiReviewNotApplicable) return "superseded";
    if (e instanceof ApiError && e.status === 409) return "busy";
    throw e;
  }
}

/** 記録したが提出にまだ当てていない、最新の AI の結果。 */
export async function pendingAiReviewId(db: Db, submissionId: string): Promise<string | null> {
  const [latest] = await db
    .select({ id: aiReviews.id, disposition: aiReviews.disposition })
    .from(aiReviews)
    .where(eq(aiReviews.submissionId, submissionId))
    .orderBy(desc(aiReviews.createdAt))
    .limit(1);
  return latest && !latest.disposition ? latest.id : null;
}

/** staff 向け: 提出の最新の AI レビュー。人に回した理由と所見・返信案を含む。 */
export async function latestAiReview(db: Db, submissionId: string) {
  const [latest] = await db
    .select()
    .from(aiReviews)
    .where(eq(aiReviews.submissionId, submissionId))
    .orderBy(desc(aiReviews.createdAt))
    .limit(1);
  return latest ?? null;
}

/**
 * 受講者向け: AI で確定した提出の返信と所見だけを返す。人に回した提出・人が確定した提出・
 * 判定前の提出の AI の所見は返さない (07 §6.3)。
 */
export async function learnerAiFeedback(
  db: Db,
  row: Pick<SubmissionRow, "id" | "verdict" | "reviewSource" | "aiReviewStatus">,
): Promise<LearnerAiFeedback | null> {
  if (row.verdict !== "pass" || row.reviewSource !== "ai" || row.aiReviewStatus !== "confirmed")
    return null;
  const [applied] = await db
    .select({ learnerReply: aiReviews.learnerReply })
    .from(aiReviews)
    .where(
      and(
        eq(aiReviews.submissionId, row.id),
        eq(aiReviews.outcome, "confirmed"),
        eq(aiReviews.disposition, "applied"),
      ),
    )
    .orderBy(desc(aiReviews.createdAt))
    .limit(1);
  return applied?.learnerReply ?? null;
}
