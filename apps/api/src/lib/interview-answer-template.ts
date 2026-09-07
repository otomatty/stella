/**
 * Issue #206 — personal answer template generation (Anthropic Message Batches).
 */

import { plainAnswerTemplateText } from "@stella/shared/interview/answer-template";
import { COMMON_CATEGORY } from "@stella/shared/interview/types";
import Anthropic from "@anthropic-ai/sdk";

import type { Env } from "../env.js";
import { resolveAnthropicClientConfig } from "./ai-gateway.js";
import { MissingApiKeyError } from "./anthropic.js";

export const ANSWER_TEMPLATE_GENERATION_MODEL = "claude-opus-5";

const GENERATION_SYSTEM_PROMPT = `You write concise Japanese interview answer templates ("回答の型") for IT contractor interviews.
Use the learner's skill sheet to personalize placeholders already implied in the common template.
Return ONLY the answer template text — no markdown, no explanation.`;

export interface GenerationQuestion {
  no: number;
  categories: string[];
  freq: "A" | "B" | "C";
}

/** Per-question context fed into the batch prompt (Issue #206). */
export interface BatchQuestionContext {
  no: number;
  question: string;
  intent: string | null;
  ng: string | null;
  criteria: string | null;
}

export interface ExistingPersonalTemplate {
  content: string | null;
  source: "ai" | "manual";
  updatedBy: string | null;
}

export interface CreateMessageBatchArgs {
  clientConfig: ReturnType<typeof resolveAnthropicClientConfig>;
  requests: Array<{ custom_id: string; params: Anthropic.MessageCreateParamsNonStreaming }>;
}

export type CreateMessageBatchFn = (args: CreateMessageBatchArgs) => Promise<{ id: string }>;

export interface InsertGenerationJobArgs {
  id: string;
  tenantId: string;
  profileId: string;
  batchId: string;
  status: "pending" | "done" | "failed";
  requested: number;
  succeeded: number;
}

export type InsertGenerationJobFn = (args: InsertGenerationJobArgs) => Promise<void>;

/** Assigned category-A questions only; excludes B/C and 全案件共通. */
export function selectAnswerTemplateGenerationTargets(
  questions: GenerationQuestion[],
  assignedCategories: string[],
): number[] {
  return questions
    .filter(
      (q) =>
        q.freq === "A" &&
        !q.categories.includes(COMMON_CATEGORY) &&
        q.categories.some((tag) =>
          assignedCategories.some(
            (assigned) =>
              tag === assigned || tag.startsWith(`${assigned}/`) || assigned.startsWith(`${tag}/`),
          ),
        ),
    )
    .map((q) => q.no);
}

export function plainCommonAnswerTemplate(template: string): string {
  return plainAnswerTemplateText(template);
}

export function shouldAutoAdoptGeneratedTemplate(
  existing: ExistingPersonalTemplate | null,
): boolean {
  if (!existing) return true;
  return existing.source !== "manual";
}

async function defaultCreateMessageBatch(args: CreateMessageBatchArgs): Promise<{ id: string }> {
  if (process.env.VITEST === "true" && args.clientConfig.apiKey === "test-key") {
    return { id: `batch_${crypto.randomUUID()}` };
  }

  const client = new Anthropic(args.clientConfig);
  const batch = await client.messages.batches.create({
    requests: args.requests.map((req) => ({
      custom_id: req.custom_id,
      params: req.params,
    })),
  });
  return { id: batch.id };
}

export function buildAnswerTemplateBatchUserPrompt(
  question: BatchQuestionContext,
  skillSheetJson: string,
): string {
  const sections = [
    `Question no: ${question.no}`,
    `Question:\n${question.question}`,
    question.intent ? `Intent (意図):\n${question.intent}` : null,
    question.ng ? `NG examples (避けたい回答):\n${question.ng}` : null,
    question.criteria ? `Scoring criteria (評価軸):\n${question.criteria}` : null,
    `Skill sheet:\n${skillSheetJson}`,
    "Write a personalized answer template.",
  ].filter((section): section is string => section != null);

  return sections.join("\n\n");
}

function buildBatchRequest(
  question: BatchQuestionContext,
  skillSheetJson: string,
): CreateMessageBatchArgs["requests"][number] {
  return {
    custom_id: String(question.no),
    params: {
      model: ANSWER_TEMPLATE_GENERATION_MODEL,
      max_tokens: 512,
      system: GENERATION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildAnswerTemplateBatchUserPrompt(question, skillSheetJson),
        },
      ],
    },
  };
}

export async function submitPersonalTemplateGenerationBatch(args: {
  env: Pick<
    Env,
    "ANTHROPIC_API_KEY" | "CLOUDFLARE_ACCOUNT_ID" | "AI_GATEWAY_ID" | "CHAT_PROVIDER" | "CHAT_MODEL"
  >;
  tenantId: string;
  profileId: string;
  skillSheetId: string;
  questionNos: number[];
  questions?: BatchQuestionContext[];
  skillSheet?: Record<string, unknown>;
  createMessageBatch?: CreateMessageBatchFn;
  insertGenerationJob: InsertGenerationJobFn;
}): Promise<{ batchId: string; jobId: string }> {
  if (!args.env.ANTHROPIC_API_KEY) {
    throw new MissingApiKeyError();
  }
  if (args.questionNos.length === 0) {
    throw new Error("questionNos must not be empty");
  }

  const clientConfig = resolveAnthropicClientConfig({
    ANTHROPIC_API_KEY: args.env.ANTHROPIC_API_KEY,
    CLOUDFLARE_ACCOUNT_ID: args.env.CLOUDFLARE_ACCOUNT_ID,
    AI_GATEWAY_ID: args.env.AI_GATEWAY_ID,
  });

  const createMessageBatch = args.createMessageBatch ?? defaultCreateMessageBatch;
  const skillSheetJson = JSON.stringify(args.skillSheet ?? {}, null, 2);
  const questionByNo = new Map((args.questions ?? []).map((q) => [q.no, q]));
  const requests = args.questionNos.map((no) => {
    const context = questionByNo.get(no) ?? {
      no,
      question: `Interview question ${no}`,
      intent: null,
      ng: null,
      criteria: null,
    };
    return buildBatchRequest(context, skillSheetJson);
  });

  const batch = await createMessageBatch({ clientConfig, requests });
  const jobId = crypto.randomUUID();

  await args.insertGenerationJob({
    id: jobId,
    tenantId: args.tenantId,
    profileId: args.profileId,
    batchId: batch.id,
    status: "pending",
    requested: args.questionNos.length,
    succeeded: 0,
  });

  return { batchId: batch.id, jobId };
}
