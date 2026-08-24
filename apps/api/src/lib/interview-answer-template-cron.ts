/**
 * Issue #206 — Cron polling for Anthropic batch completion.
 */

import type { Env } from "../env.js";
import {
  shouldAutoAdoptGeneratedTemplate,
  type ExistingPersonalTemplate,
} from "./interview-answer-template.js";

export interface PendingGenerationJob {
  id: string;
  tenantId: string;
  profileId: string;
  batchId: string;
  status: "pending" | "done" | "failed";
  requested: number;
  succeeded: number;
  createdAt: Date;
}

export interface BatchResultItem {
  custom_id: string;
  result: {
    type: string;
    message?: { content: Array<{ text?: string }> };
  };
}

export type RetrieveMessageBatchFn = (batchId: string) => Promise<{
  id: string;
  processing_status: string;
  request_counts: { succeeded: number; errored: number; canceled: number; expired: number };
}>;

export type FetchBatchResultsFn = (batchId: string) => Promise<BatchResultItem[]>;

export interface UpsertPersonalTemplateDraftArgs {
  tenantId: string;
  profileId: string;
  questionNo: number;
  content?: string | null;
  draftContent?: string | null;
  source?: "ai" | "manual";
  generatedFrom?: string | null;
  updatedBy?: string | null;
}

export type UpsertPersonalTemplateDraftFn = (
  args: UpsertPersonalTemplateDraftArgs,
) => Promise<void>;

export type InsertNotificationFn = (args: {
  userId: string;
  tenantId: string;
  type: "interview_answer_template_generated" | "interview_answer_template_failed";
  title: string;
  body: string;
}) => Promise<void>;

export type UpdateGenerationJobFn = (args: {
  id: string;
  status: "pending" | "done" | "failed";
  succeeded: number;
}) => Promise<void>;

/** Only the newest generation job for a profile may write template data. */
export function isLatestGenerationJobForProfile(
  job: Pick<PendingGenerationJob, "id" | "tenantId" | "profileId" | "createdAt">,
  allJobs: Array<Pick<PendingGenerationJob, "id" | "tenantId" | "profileId" | "createdAt">>,
): boolean {
  const profileJobs = allJobs.filter(
    (candidate) => candidate.tenantId === job.tenantId && candidate.profileId === job.profileId,
  );
  if (profileJobs.length === 0) return true;

  const latest = profileJobs.reduce((current, candidate) =>
    candidate.createdAt.getTime() > current.createdAt.getTime() ? candidate : current,
  );
  if (latest.createdAt.getTime() > job.createdAt.getTime()) return false;
  if (latest.createdAt.getTime() < job.createdAt.getTime()) return true;
  return latest.id === job.id;
}

function extractResultText(item: BatchResultItem): string | null {
  if (item.result.type !== "succeeded") return null;
  const block = item.result.message?.content?.[0];
  return block?.text?.trim() ?? null;
}

function batchHasFailures(counts: {
  succeeded: number;
  errored: number;
  canceled: number;
  expired: number;
}): boolean {
  return counts.errored + counts.canceled + counts.expired > 0;
}

export async function pollPersonalTemplateGenerationJobs(args: {
  env: Pick<Env, "ANTHROPIC_API_KEY">;
  pendingJobs: PendingGenerationJob[];
  allJobs: Array<Pick<PendingGenerationJob, "id" | "tenantId" | "profileId" | "createdAt">>;
  retrieveMessageBatch: RetrieveMessageBatchFn;
  fetchBatchResults: FetchBatchResultsFn;
  upsertPersonalTemplateDraft: UpsertPersonalTemplateDraftFn;
  insertNotification: InsertNotificationFn;
  updateGenerationJob: UpdateGenerationJobFn;
  existingTemplateForQuestion?: (
    profileId: string,
    questionNo: number,
  ) => Promise<ExistingPersonalTemplate | null>;
  skillSheetId?: string;
}): Promise<void> {
  if (!args.env.ANTHROPIC_API_KEY) return;

  for (const job of args.pendingJobs) {
    if (job.status !== "pending") continue;

    if (!isLatestGenerationJobForProfile(job, args.allJobs)) {
      await args.updateGenerationJob({
        id: job.id,
        status: "done",
        succeeded: 0,
      });
      continue;
    }

    let batch: Awaited<ReturnType<RetrieveMessageBatchFn>>;
    try {
      batch = await args.retrieveMessageBatch(job.batchId);
    } catch {
      await args.insertNotification({
        userId: job.profileId,
        tenantId: job.tenantId,
        type: "interview_answer_template_failed",
        title: "個別の回答の型の生成に失敗しました",
        body: "スキルシートをもとにした回答の型の生成に失敗しました。スキルシートを保存し直して再試行してください。",
      });
      await args.updateGenerationJob({
        id: job.id,
        status: "failed",
        succeeded: 0,
      });
      continue;
    }

    if (batch.processing_status !== "ended") continue;

    const counts = batch.request_counts;
    const results = await args.fetchBatchResults(job.batchId);
    let succeeded = 0;

    for (const item of results) {
      const text = extractResultText(item);
      if (!text) continue;

      const questionNo = Number.parseInt(item.custom_id, 10);
      if (!Number.isFinite(questionNo)) continue;

      const existing = args.existingTemplateForQuestion
        ? await args.existingTemplateForQuestion(job.profileId, questionNo)
        : null;

      if (!args.existingTemplateForQuestion) {
        await args.upsertPersonalTemplateDraft({
          tenantId: job.tenantId,
          profileId: job.profileId,
          questionNo,
          draftContent: text,
          generatedFrom: args.skillSheetId ?? null,
          updatedBy: "system",
        });
      } else if (shouldAutoAdoptGeneratedTemplate(existing)) {
        await args.upsertPersonalTemplateDraft({
          tenantId: job.tenantId,
          profileId: job.profileId,
          questionNo,
          content: text,
          draftContent: null,
          source: "ai",
          generatedFrom: args.skillSheetId ?? null,
          updatedBy: "system",
        });
      } else {
        await args.upsertPersonalTemplateDraft({
          tenantId: job.tenantId,
          profileId: job.profileId,
          questionNo,
          content: existing?.content ?? null,
          draftContent: text,
          source: existing?.source ?? "manual",
          generatedFrom: args.skillSheetId ?? null,
          updatedBy: existing?.updatedBy ?? null,
        });
      }

      succeeded += 1;
    }

    const generationFailed =
      succeeded === 0 &&
      (batchHasFailures(counts) || results.length === 0 || counts.succeeded === 0);

    if (generationFailed) {
      await args.insertNotification({
        userId: job.profileId,
        tenantId: job.tenantId,
        type: "interview_answer_template_failed",
        title: "個別の回答の型の生成に失敗しました",
        body: "スキルシートをもとにした回答の型の生成に失敗しました。スキルシートを保存し直して再試行してください。",
      });
      await args.updateGenerationJob({
        id: job.id,
        status: "failed",
        succeeded: 0,
      });
      continue;
    }

    if (succeeded > 0) {
      await args.insertNotification({
        userId: job.profileId,
        tenantId: job.tenantId,
        type: "interview_answer_template_generated",
        title: "個別の回答の型が生成されました",
        body: "スキルシートをもとに、面談対策の回答の型を生成しました。内容を確認してください。",
      });
    }

    await args.updateGenerationJob({
      id: job.id,
      status: "done",
      succeeded,
    });
  }
}
