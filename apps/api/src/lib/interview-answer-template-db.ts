/**
 * Issue #206 — DB helpers for personal answer templates and generation jobs.
 */

import { and, asc, eq } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";

import {
  generationJobs,
  interviewPersonalTemplates,
  interviewPrepAssignments,
  interviewQuestions,
  notifications,
} from "../db/schema.js";
import type { Db } from "../db/client.js";
import type { Env } from "../env.js";
import { resolveAnthropicClientConfig } from "./ai-gateway.js";
import {
  plainCommonAnswerTemplate,
  selectAnswerTemplateGenerationTargets,
  submitPersonalTemplateGenerationBatch,
} from "./interview-answer-template.js";
import { pollPersonalTemplateGenerationJobs } from "./interview-answer-template-cron.js";

export async function enqueuePersonalAnswerTemplateGeneration(args: {
  db: Db;
  env: Env;
  tenantId: string;
  profileId: string;
  skillSheetId: string;
  sheet: Record<string, unknown>;
}): Promise<void> {
  if (!args.env.ANTHROPIC_API_KEY) return;

  const assignment = await args.db
    .select({ categories: interviewPrepAssignments.categories })
    .from(interviewPrepAssignments)
    .where(
      and(
        eq(interviewPrepAssignments.tenantId, args.tenantId),
        eq(interviewPrepAssignments.profileId, args.profileId),
      ),
    )
    .limit(1);
  const categories = assignment[0]?.categories ?? [];
  if (categories.length === 0) return;

  const questions = await args.db
    .select({
      no: interviewQuestions.no,
      categories: interviewQuestions.categories,
      freq: interviewQuestions.freq,
      question: interviewQuestions.question,
      intent: interviewQuestions.intent,
      ng: interviewQuestions.ng,
      criteria: interviewQuestions.criteria,
    })
    .from(interviewQuestions)
    .where(eq(interviewQuestions.tenantId, args.tenantId))
    .orderBy(asc(interviewQuestions.no));

  const questionNos = selectAnswerTemplateGenerationTargets(questions, categories);
  if (questionNos.length === 0) return;

  const batchQuestions = questions
    .filter((q) => questionNos.includes(q.no))
    .map((q) => ({
      no: q.no,
      question: q.question,
      intent: q.intent,
      ng: q.ng,
      criteria: q.criteria,
    }));

  await submitPersonalTemplateGenerationBatch({
    env: args.env,
    tenantId: args.tenantId,
    profileId: args.profileId,
    skillSheetId: args.skillSheetId,
    questionNos,
    questions: batchQuestions,
    skillSheet: args.sheet,
    insertGenerationJob: async (job) => {
      await args.db.insert(generationJobs).values({
        id: job.id,
        tenantId: job.tenantId,
        profileId: job.profileId,
        batchId: job.batchId,
        status: job.status,
        requested: job.requested,
        succeeded: job.succeeded,
      });
    },
  });
}

export async function loadPersonalTemplatesByQuestion(
  db: Db,
  tenantId: string,
  profileId: string,
): Promise<
  Map<
    number,
    {
      content: string | null;
      draftContent: string | null;
      source: "ai" | "manual";
      updatedBy: string | null;
    }
  >
> {
  const rows = await db
    .select({
      questionNo: interviewPersonalTemplates.questionNo,
      content: interviewPersonalTemplates.content,
      draftContent: interviewPersonalTemplates.draftContent,
      source: interviewPersonalTemplates.source,
      updatedBy: interviewPersonalTemplates.updatedBy,
    })
    .from(interviewPersonalTemplates)
    .where(
      and(
        eq(interviewPersonalTemplates.tenantId, tenantId),
        eq(interviewPersonalTemplates.profileId, profileId),
      ),
    );

  const map = new Map<
    number,
    {
      content: string | null;
      draftContent: string | null;
      source: "ai" | "manual";
      updatedBy: string | null;
    }
  >();
  for (const row of rows) {
    map.set(row.questionNo, {
      content: row.content,
      draftContent: row.draftContent,
      source: row.source,
      updatedBy: row.updatedBy,
    });
  }
  return map;
}

export function enrichQuestionRows<
  T extends {
    no: number;
    freq: "A" | "B" | "C";
    answer_template: string | null;
  },
>(
  rows: T[],
  personalByQuestion: Map<
    number,
    {
      content: string | null;
      draftContent: string | null;
    }
  >,
): Array<
  T & {
    answer_template: string | null;
    personal_answer_template: string | null;
    draft_answer_template: string | null;
    has_pending_draft: boolean;
  }
> {
  return rows.map((row) => {
    const personal = personalByQuestion.get(row.no);
    const plainCommon =
      row.answer_template != null ? plainCommonAnswerTemplate(row.answer_template) : null;
    const personalContent = row.freq === "A" ? (personal?.content ?? null) : null;
    const draftContent = row.freq === "A" ? (personal?.draftContent ?? null) : null;
    return {
      ...row,
      answer_template: plainCommon,
      personal_answer_template: personalContent,
      draft_answer_template: draftContent,
      has_pending_draft: Boolean(draftContent),
    };
  });
}

export async function upsertPersonalAnswerTemplate(args: {
  db: Db;
  tenantId: string;
  profileId: string;
  questionNo: number;
  content: string;
  updatedBy: string;
}): Promise<void> {
  await args.db
    .insert(interviewPersonalTemplates)
    .values({
      tenantId: args.tenantId,
      profileId: args.profileId,
      questionNo: args.questionNo,
      content: args.content,
      draftContent: null,
      source: "manual",
      updatedBy: args.updatedBy,
    })
    .onConflictDoUpdate({
      target: [
        interviewPersonalTemplates.tenantId,
        interviewPersonalTemplates.profileId,
        interviewPersonalTemplates.questionNo,
      ],
      set: {
        content: args.content,
        draftContent: null,
        source: "manual",
        updatedBy: args.updatedBy,
        updatedAt: new Date(),
      },
    });
}

export async function adoptPersonalTemplateDraft(args: {
  db: Db;
  tenantId: string;
  profileId: string;
  questionNo: number;
  updatedBy: string;
}): Promise<void> {
  const rows = await args.db
    .select({
      content: interviewPersonalTemplates.content,
      draftContent: interviewPersonalTemplates.draftContent,
    })
    .from(interviewPersonalTemplates)
    .where(
      and(
        eq(interviewPersonalTemplates.tenantId, args.tenantId),
        eq(interviewPersonalTemplates.profileId, args.profileId),
        eq(interviewPersonalTemplates.questionNo, args.questionNo),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row?.draftContent) {
    throw new Error("draft not found");
  }

  await args.db
    .insert(interviewPersonalTemplates)
    .values({
      tenantId: args.tenantId,
      profileId: args.profileId,
      questionNo: args.questionNo,
      content: row.draftContent,
      draftContent: null,
      source: "manual",
      updatedBy: args.updatedBy,
    })
    .onConflictDoUpdate({
      target: [
        interviewPersonalTemplates.tenantId,
        interviewPersonalTemplates.profileId,
        interviewPersonalTemplates.questionNo,
      ],
      set: {
        content: row.draftContent,
        draftContent: null,
        source: "manual",
        updatedBy: args.updatedBy,
        updatedAt: new Date(),
      },
    });
}

export async function insertAnswerTemplateGeneratedNotification(args: {
  db: Db;
  tenantId: string;
  profileId: string;
}): Promise<void> {
  await args.db.insert(notifications).values({
    userId: args.profileId,
    tenantId: args.tenantId,
    type: "interview_answer_template_generated",
    title: "個別の回答の型が生成されました",
    body: "スキルシートをもとに、面談対策の回答の型を生成しました。内容を確認してください。",
    payload: {},
  });
}

export async function insertAnswerTemplateFailedNotification(args: {
  db: Db;
  tenantId: string;
  profileId: string;
}): Promise<void> {
  await args.db.insert(notifications).values({
    userId: args.profileId,
    tenantId: args.tenantId,
    type: "interview_answer_template_failed",
    title: "個別の回答の型の生成に失敗しました",
    body: "スキルシートをもとにした回答の型の生成に失敗しました。スキルシートを保存し直して再試行してください。",
    payload: {},
  });
}

/** Cron: pending generation_jobs をポーリングしてドラフトを反映する (Issue #206)。 */
export async function runPersonalTemplateGenerationCron(env: Env, db: Db): Promise<void> {
  if (!env.ANTHROPIC_API_KEY) return;

  const pendingJobs = await db
    .select({
      id: generationJobs.id,
      tenantId: generationJobs.tenantId,
      profileId: generationJobs.profileId,
      batchId: generationJobs.batchId,
      status: generationJobs.status,
      requested: generationJobs.requested,
      succeeded: generationJobs.succeeded,
      createdAt: generationJobs.createdAt,
    })
    .from(generationJobs)
    .where(eq(generationJobs.status, "pending"));

  if (pendingJobs.length === 0) return;

  const allJobs = await db
    .select({
      id: generationJobs.id,
      tenantId: generationJobs.tenantId,
      profileId: generationJobs.profileId,
      createdAt: generationJobs.createdAt,
    })
    .from(generationJobs);

  const clientConfig = resolveAnthropicClientConfig({
    ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
    CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
    AI_GATEWAY_ID: env.AI_GATEWAY_ID,
  });
  const client = new Anthropic(clientConfig);

  await pollPersonalTemplateGenerationJobs({
    env,
    pendingJobs,
    allJobs,
    retrieveMessageBatch: async (batchId) => {
      const batch = await client.messages.batches.retrieve(batchId);
      return {
        id: batch.id,
        processing_status: batch.processing_status,
        request_counts: batch.request_counts,
      };
    },
    fetchBatchResults: async (batchId) => {
      const results: Array<{
        custom_id: string;
        result: { type: string; message?: { content: Array<{ text?: string }> } };
      }> = [];
      for await (const item of await client.messages.batches.results(batchId)) {
        results.push(item as (typeof results)[number]);
      }
      return results;
    },
    existingTemplateForQuestion: async (profileId, questionNo) => {
      const rows = await db
        .select({
          content: interviewPersonalTemplates.content,
          source: interviewPersonalTemplates.source,
          updatedBy: interviewPersonalTemplates.updatedBy,
        })
        .from(interviewPersonalTemplates)
        .where(
          and(
            eq(interviewPersonalTemplates.profileId, profileId),
            eq(interviewPersonalTemplates.questionNo, questionNo),
          ),
        )
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return row;
    },
    upsertPersonalTemplateDraft: async (args) => {
      await db
        .insert(interviewPersonalTemplates)
        .values({
          tenantId: args.tenantId,
          profileId: args.profileId,
          questionNo: args.questionNo,
          content: args.content ?? null,
          draftContent: args.draftContent ?? null,
          generatedFrom: args.generatedFrom ?? null,
          source: args.source ?? "ai",
          updatedBy: args.updatedBy ?? "system",
        })
        .onConflictDoUpdate({
          target: [
            interviewPersonalTemplates.tenantId,
            interviewPersonalTemplates.profileId,
            interviewPersonalTemplates.questionNo,
          ],
          set: {
            ...(args.content !== undefined ? { content: args.content } : {}),
            ...(args.draftContent !== undefined ? { draftContent: args.draftContent } : {}),
            generatedFrom: args.generatedFrom ?? null,
            source: args.source ?? "ai",
            updatedBy: args.updatedBy ?? "system",
            updatedAt: new Date(),
          },
        });

      if (args.content && (args.draftContent === null || args.draftContent === undefined)) {
        await recordAnswerTemplateGeneratedAudit(
          db,
          args.tenantId,
          args.profileId,
          args.questionNo,
        );
      }
    },
    insertNotification: async (n) => {
      if (n.type === "interview_answer_template_failed") {
        await insertAnswerTemplateFailedNotification({
          db,
          tenantId: n.tenantId,
          profileId: n.userId,
        });
        return;
      }
      await insertAnswerTemplateGeneratedNotification({
        db,
        tenantId: n.tenantId,
        profileId: n.userId,
      });
    },
    updateGenerationJob: async (job) => {
      await db
        .update(generationJobs)
        .set({ status: job.status, succeeded: job.succeeded, updatedAt: new Date() })
        .where(eq(generationJobs.id, job.id));
    },
  });
}

async function recordAnswerTemplateGeneratedAudit(
  db: Db,
  tenantId: string,
  profileId: string,
  questionNo: number,
): Promise<void> {
  try {
    const { auditLogs } = await import("../db/schema.js");
    await db.insert(auditLogs).values({
      tenantId,
      actorId: "system",
      actorName: "system",
      actorRole: "system",
      action: "answer_template_generated",
      targetType: "interview_personal_template",
      targetId: `${profileId}:${questionNo}`,
      metadata: { questionNo },
    });
  } catch (e) {
    console.error("[answer-template] audit log failed", e);
  }
}
