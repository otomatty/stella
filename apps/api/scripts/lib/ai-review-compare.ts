import { parseArgs } from "node:util";
import { AI_REVIEW_THRESHOLD_VERSION } from "@stella/shared/review/ai-review";
import { eq } from "drizzle-orm";
import type { Db } from "../../src/db/client.js";
import { submissions } from "../../src/db/schema.js";
import type { Env } from "../../src/env.js";
import { callAiReview } from "../../src/lib/ai-review-completion.js";
import { judgeAiReview, judgeMaterialOf } from "../../src/lib/ai-review-judgement.js";
import { type LoadedMaterial, loadMaterial } from "../../src/lib/ai-review-material.js";
import {
  AI_REVIEW_PROMPT_VERSION,
  buildAiReviewPrompt,
  MAX_REVIEW_INPUT_CHARS,
} from "../../src/lib/ai-review-prompt.js";
import type { AiReviewProvider } from "../../src/lib/ai-review-provider.js";
import { submissionForcedReasons } from "../../src/lib/ai-review.js";
import type { EvalExample } from "./ai-review-eval.js";

export function parseCompareArgs(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      provider: { type: "string" },
      model: { type: "string" },
      limit: { type: "string" },
      run: { type: "boolean", default: false },
      remote: { type: "boolean", default: false },
      data: { type: "string" },
    },
  });
  if (values.provider !== "openai" && values.provider !== "anthropic")
    throw new Error("--provider openai / anthropic を指定してください");
  if (!values.model || !/^[A-Za-z0-9._:-]+$/.test(values.model))
    throw new Error("--model に評価するモデル ID を指定してください");
  if (values.run && values.limit === undefined)
    throw new Error("API を呼ぶときは --run と --limit の両方が必要です");
  const limit = Number(values.limit ?? 10);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50)
    throw new Error("--limit は 1〜50 を指定してください");
  return { ...values, provider: values.provider as AiReviewProvider, model: values.model, limit };
}

export interface PreparedComparison {
  example: EvalExample;
  prompt: ReturnType<typeof buildAiReviewPrompt>;
  loaded: LoadedMaterial;
  forced: Awaited<ReturnType<typeof submissionForcedReasons>>;
}

/** 読み出しと API 呼び出しを分ける。dry-run でも同じ教材の版と入力上限を検査する。 */
export async function prepareComparison(
  db: Db,
  env: Env,
  example: EvalExample,
): Promise<PreparedComparison | { skipped: string }> {
  const [row] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, example.submissionId))
    .limit(1);
  if (!row) return { skipped: "missing" };
  const loaded = await loadMaterial(db, env, row).catch(() => ({ failure: "error" as const }));
  if ("failure" in loaded) return { skipped: loaded.failure };
  const prompt = buildAiReviewPrompt(loaded.material);
  if (prompt.variableChars > MAX_REVIEW_INPUT_CHARS) return { skipped: "too-large" };
  return { example, prompt, loaded, forced: await submissionForcedReasons(db, row) };
}

/** 合否・進捗・キューへ書かずに、本番と同じ通信と判定を当てる。自動再試行はしない。 */
export async function compareReview(env: Env, input: PreparedComparison): Promise<EvalExample> {
  const call = await callAiReview(env, input.prompt, 25_000);
  const { decision } = judgeAiReview({
    kind: input.example.taskKind,
    material: judgeMaterialOf(input.loaded),
    forced: input.forced,
    output: call.ok ? call.output : null,
    lines: input.prompt.lines,
  });
  return {
    ...input.example,
    aiReviewId: "comparison",
    provider: call.provider,
    model: call.model,
    promptVersion: AI_REVIEW_PROMPT_VERSION,
    thresholdVersion: AI_REVIEW_THRESHOLD_VERSION,
    outcome: decision.outcome,
    routeReasons: decision.reasons,
    confidence: decision.confidence,
    proposedVerdict: decision.proposedVerdict,
    failure: call.ok ? null : call.failure,
  };
}
