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

import Anthropic from "@anthropic-ai/sdk";
import {
  AI_REVIEW_OUTPUT_SCHEMA,
  AI_REVIEW_THRESHOLD_VERSION,
  type AiFailure,
  type AiFinding,
  type AiLearnerReply,
  type AiReviewOutput,
  decideRouting,
  formatLearnerReply,
  forcedHumanReasons,
  isEvidenceKind,
  type LearnerAiFeedback,
  parseAiReviewOutput,
  ROUTE_REASONS,
  type ReviewRubricItem,
} from "@stella/shared/review/ai-review";
import { checkSolutionLeak } from "@stella/shared/review/solution-leak";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { Db } from "../db/client.js";
import {
  aiReviews,
  sections,
  stages,
  submissions,
  taskPrivateVersions,
  taskRevisions,
  tasks,
} from "../db/schema.js";
import type { Env } from "../env.js";
import { MissingGatewayConfigError } from "./ai-gateway.js";
import {
  AI_REVIEW_PROMPT_VERSION,
  buildAiReviewPrompt,
  MAX_REVIEW_INPUT_CHARS,
  type ReviewMaterial,
} from "./ai-review-prompt.js";
import { completeJsonSchema, resolveAnthropicModel } from "./anthropic-complete.js";
import { MissingApiKeyError } from "./anthropic.js";
import { ApiError, type Caller } from "./authz.js";
import { loadCodingRuleSet } from "./coding-rule-set.js";
import { autoCompleteStagesIfMet } from "./stage-auto-complete.js";
import {
  AiReviewNeedsHuman,
  AiReviewNotApplicable,
  assessmentRecordedSupport,
  escalateTaskSubmission,
  readSubmissionFiles,
  reviewTaskSubmission,
} from "./task-submission.js";

/** AI の応答の上限。判定 JSON は数千トークンに収まる。打ち切られたら形式の誤りとして人に回す。 */
const MAX_OUTPUT_TOKENS = 16_000;

/** 練習で返信が解答例と重なったときに、受講者へ代わりに返す文。 */
const SAFE_REPLY: AiLearnerReply = {
  message: "提出を確認しました。気になる点があれば、講師への相談から質問してください。",
  goodPoints: [],
  nextSteps: [],
};

type SubmissionRow = typeof submissions.$inferSelect;

interface LoadedMaterial {
  material: ReviewMaterial;
  stageId: string;
  /** 受講者がすでに持っている本文 (提出と配布物)。返信の照合で除く。 */
  known: string[];
  appliedRules: { id: string; required: boolean; contentHash: string | null }[];
  ruleSetHash: string;
  escalateWhen: string[];
}

function decodeBase64(value: string): string {
  return new TextDecoder().decode(Uint8Array.from(atob(value), (c) => c.charCodeAt(0)));
}

interface TaskDefinitionReview {
  kind?: string;
  title?: string;
  review?: {
    rules?: { id: string; required: boolean }[];
    rubric?: { id: string; criterion: string; required: boolean }[];
    escalateWhen?: string[];
  };
}

/** 提出時の課題の版・規則・解答例・提出ファイルを集める。足りなければ失敗の理由を返す。 */
async function loadMaterial(
  db: Db,
  env: Env,
  row: SubmissionRow,
): Promise<LoadedMaterial | { failure: AiFailure; detail: string }> {
  if (!row.taskId || !row.taskContentHash)
    return { failure: "error", detail: "課題の提出ではありません" };
  const [task] = await db
    .select({ stageId: sections.stageId, slug: stages.slug })
    .from(tasks)
    .innerJoin(sections, eq(sections.id, tasks.sectionId))
    .innerJoin(stages, eq(stages.id, sections.stageId))
    .where(eq(tasks.id, row.taskId))
    .limit(1);
  const [revision] = await db
    .select({ definition: taskRevisions.definition, bundle: taskRevisions.bundle })
    .from(taskRevisions)
    .where(
      and(eq(taskRevisions.taskId, row.taskId), eq(taskRevisions.contentHash, row.taskContentHash)),
    )
    .limit(1);
  if (!task || !revision) return { failure: "error", detail: "課題の版が見つかりません" };
  // 解答例と観点は、提出を受け付けた時点の素材の版を読む。版が記録されていない提出
  // (今の版と違う課題の版への提出、0048 より前で素材が分からない提出) と、版の行が無い提出は、
  // 別の解答例で判定・照合しないよう AI を呼ばずに人に回す。
  const [privateVersion] = row.taskPrivateHash
    ? await db
        .select({ files: taskPrivateVersions.files })
        .from(taskPrivateVersions)
        .where(
          and(
            eq(taskPrivateVersions.taskId, row.taskId),
            eq(taskPrivateVersions.privateHash, row.taskPrivateHash),
          ),
        )
        .limit(1)
    : [];
  if (!privateVersion)
    return {
      failure: "stale-material",
      detail: row.taskPrivateHash
        ? `非公開の素材の版 (${row.taskPrivateHash.slice(0, 20)}) がありません`
        : "提出時の非公開の素材の版が記録されていません",
    };
  const definition = JSON.parse(revision.definition) as TaskDefinitionReview;
  const ruleRefs = definition.review?.rules ?? [];
  const ruleSet = await loadCodingRuleSet(db, task.slug);
  const ruleRows = ruleSet.rows;
  // 提出のあとに規則が変わっていたら、受け付けた時点に無かった規則で判定しないよう人に回す。
  // 版が null の提出は 0048 より前のもの (規則の正本がまだ無かった) なので、今の規則で見る。
  if (row.ruleSetHash !== null && row.ruleSetHash !== ruleSet.hash)
    return {
      failure: "stale-material",
      detail: `提出のあとにコーディング規則が変わりました (${row.ruleSetHash.slice(0, 12)} → ${ruleSet.hash.slice(0, 12)})`,
    };
  // 提出の版が参照する規則が正本から消えていたら、本文なしでは判定できないので AI を呼ばずに
  // 人に回す (AI が本文の無い項目に「満たす」と答えても確定させない)。
  const missingRules = ruleRefs.filter((ref) => !ruleRows.some((r) => r.id === ref.id));
  if (missingRules.length > 0)
    return {
      failure: "stale-material",
      detail: `規則の本文が見つかりません: ${missingRules.map((ref) => ref.id).join(", ")}`,
    };
  const { commonRules, courseRules } = ruleSet;
  const rubric: ReviewRubricItem[] = [
    ...ruleRefs.flatMap((ref) => {
      const rule = ruleRows.find((r) => r.id === ref.id);
      return rule
        ? [{ id: ref.id, criterion: rule.statement, required: ref.required, rule: true }]
        : [];
    }),
    ...(definition.review?.rubric ?? []).map((item) => ({ ...item, rule: false })),
  ];
  const privateFiles = JSON.parse(privateVersion.files) as Record<string, string>;
  const solution = Object.entries(privateFiles)
    .filter(([path]) => path.startsWith("solution/"))
    .map(([path, value]) => ({ path: path.slice("solution/".length), text: decodeBase64(value) }));
  const snapshot = row.taskSnapshot;
  // 配布物 (starter・テスト・課題文) は受講者がすでに持っているので、返信の照合から除く。
  const bundle = JSON.parse(revision.bundle) as { files?: Record<string, string> };
  const bundleTexts = Object.values(bundle.files ?? {}).map(decodeBase64);
  let files: Awaited<ReturnType<typeof readSubmissionFiles>>;
  try {
    files = await readSubmissionFiles(db, env, row.id);
  } catch (e) {
    return {
      failure: "error",
      detail: e instanceof Error ? e.message : "提出ファイルを読めません",
    };
  }
  const submissionFiles = files.map((f) => ({
    path: f.path,
    bytes: f.bytes,
    text: f.text.includes("\u0000") || f.text.includes("�") ? null : f.text,
  }));
  const material: ReviewMaterial = {
    kind: row.taskKind ?? definition.kind ?? "basic",
    taskTitle: row.assignmentTitle,
    courseSlug: task.slug,
    taskText: snapshot?.files["README.md"] ? decodeBase64(snapshot.files["README.md"]) : "",
    rubric,
    commonRules,
    courseRules,
    solution,
    reviewGuide: privateFiles["review.md"] ? decodeBase64(privateFiles["review.md"]) : "",
    submission: {
      files: submissionFiles,
      explanation: row.explanation ?? "",
      debuggingRecord: row.debuggingRecord ?? null,
      localResult: row.localResult ?? null,
      support: row.supportLog ?? [],
    },
  };
  return {
    material,
    stageId: task.stageId,
    known: [
      ...submissionFiles.flatMap((f) => (f.text === null ? [] : [f.text])),
      ...bundleTexts,
      row.explanation ?? "",
    ],
    appliedRules: ruleRefs.map((ref) => ({
      id: ref.id,
      required: ref.required,
      contentHash: ruleRows.find((r) => r.id === ref.id)?.contentHash ?? null,
    })),
    ruleSetHash: ruleSet.hash,
    escalateWhen: definition.review?.escalateWhen ?? [],
  };
}

export type AiCallResult =
  | {
      ok: true;
      output: AiReviewOutput;
      model: string;
      usage: Record<string, number | null>;
    }
  | { ok: false; failure: AiFailure; retryable: boolean; detail: string; model: string | null };

/** AI を 1 回呼ぶ。失敗は理由と、待ち行列でやり直す価値があるかに分ける。 */
async function callAi(
  env: Env,
  prompt: ReturnType<typeof buildAiReviewPrompt>,
  timeoutMs: number,
): Promise<AiCallResult> {
  const model = resolveAnthropicModel(env, env.AI_REVIEW_MODEL);
  try {
    const completion = await completeJsonSchema({
      env,
      model,
      system: prompt.system,
      messages: prompt.messages,
      schema: AI_REVIEW_OUTPUT_SCHEMA as unknown as Record<string, unknown>,
      maxTokens: MAX_OUTPUT_TOKENS,
      timeoutMs,
    });
    if (completion.stopReason === "refusal")
      return {
        ok: false,
        failure: "refusal",
        retryable: false,
        detail: "refusal",
        model: completion.model,
      };
    const output =
      completion.stopReason === "max_tokens" ? null : parseAiReviewOutput(completion.text);
    if (!output)
      return {
        ok: false,
        failure: "invalid-format",
        retryable: false,
        detail: `stop_reason=${completion.stopReason ?? "null"}`,
        model: completion.model,
      };
    return { ok: true, output, model: completion.model, usage: completion.usage };
  } catch (e) {
    if (e instanceof MissingApiKeyError || e instanceof MissingGatewayConfigError)
      return {
        ok: false,
        failure: "unavailable",
        retryable: false,
        detail: e.message,
        model: null,
      };
    if (
      e instanceof Anthropic.APIConnectionTimeoutError ||
      e instanceof Anthropic.APIUserAbortError ||
      (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError"))
    )
      return { ok: false, failure: "timeout", retryable: true, detail: "timeout", model };
    if (e instanceof Anthropic.APIConnectionError)
      return { ok: false, failure: "error", retryable: true, detail: e.message, model };
    if (e instanceof Anthropic.APIError) {
      const status = e.status ?? 0;
      return {
        ok: false,
        failure: "error",
        retryable: status === 429 || status >= 500,
        detail: `${status} ${e.message}`.slice(0, 500),
        model,
      };
    }
    return {
      ok: false,
      failure: "error",
      retryable: false,
      detail: e instanceof Error ? e.message.slice(0, 500) : "unknown",
      model,
    };
  }
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
  const forced = forcedHumanReasons({
    kind,
    mode: row.submissionMode,
    machineCheck: row.machineCheck ?? null,
    support: row.supportLog ?? null,
    recordedSupport: await assessmentRecordedSupport(db, row),
  });
  let call: AiCallResult;
  let prompt: ReturnType<typeof buildAiReviewPrompt> | null = null;
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
        : env.ANTHROPIC_API_KEY
          ? await callAi(env, prompt, opts.timeoutMs)
          : {
              ok: false,
              failure: "unavailable",
              retryable: false,
              detail: "ANTHROPIC_API_KEY が未設定です",
              model: null,
            };
  }
  if (!call.ok && call.retryable && !opts.finalAttempt)
    return { status: "retry", detail: `${call.failure}: ${call.detail}` };

  const output = call.ok ? call.output : null;
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
    output && !("failure" in loaded)
      ? checkSolutionLeak({
          texts: visible,
          solution: loaded.material.solution.map((f) => f.text),
          known: loaded.known,
          strict,
        })
      : null;
  const leaked = (leak?.hits.length ?? 0) > 0;
  const decision = decideRouting({
    kind,
    rubric: "failure" in loaded ? [] : loaded.material.rubric,
    escalateWhen: "failure" in loaded ? [] : loaded.escalateWhen,
    forced,
    output,
    lines: prompt?.lines ?? new Map(),
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
  const [inserted] = await db
    .insert(aiReviews)
    .values({
      submissionId: row.id,
      tenantId: row.tenantId,
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
      leakCheck: leak
        ? { ...leak, action: !leaked ? "none" : strict ? "escalate" : "sanitize" }
        : null,
      appliedRules: "failure" in loaded ? [] : loaded.appliedRules,
      ruleSetHash: "failure" in loaded ? null : loaded.ruleSetHash,
      failure: call.ok ? null : call.failure,
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
      tenantId: row.tenantId,
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
      tenantId: submissions.tenantId,
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
      tenantId: row.tenantId,
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
