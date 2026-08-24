/**
 * Issue #206 — Cron polling for Anthropic batch completion (TDD).
 */

import { describe, expect, it, vi } from "vitest";

import type { Env } from "../env.js";
import {
  isLatestGenerationJobForProfile,
  pollPersonalTemplateGenerationJobs,
  type PendingGenerationJob,
} from "./interview-answer-template-cron.js";

const BASE_TIME = new Date("2026-08-24T00:00:00.000Z");

function makeJob(
  overrides: Partial<PendingGenerationJob> & Pick<PendingGenerationJob, "id" | "batchId">,
): PendingGenerationJob {
  return {
    tenantId: "ses",
    profileId: "seed-learner",
    status: "pending",
    requested: 1,
    succeeded: 0,
    createdAt: BASE_TIME,
    ...overrides,
  };
}

describe("isLatestGenerationJobForProfile (#206)", () => {
  it("returns true when the job is the newest for the profile", () => {
    const older = makeJob({ id: "job-old", batchId: "batch-old", createdAt: BASE_TIME });
    const newer = makeJob({
      id: "job-new",
      batchId: "batch-new",
      createdAt: new Date("2026-08-24T01:00:00.000Z"),
    });

    expect(isLatestGenerationJobForProfile(newer, [older, newer])).toBe(true);
    expect(isLatestGenerationJobForProfile(older, [older, newer])).toBe(false);
  });
});

describe("pollPersonalTemplateGenerationJobs (#206)", () => {
  it("persists generated drafts and notifies the learner when a batch completes", async () => {
    const job = makeJob({ id: "job-1", batchId: "batch_abc123" });
    const retrieveMessageBatch = vi.fn().mockResolvedValue({
      id: "batch_abc123",
      processing_status: "ended",
      request_counts: { succeeded: 1, errored: 0, canceled: 0, expired: 0 },
    });
    const fetchBatchResults = vi.fn().mockResolvedValue([
      {
        custom_id: "101",
        result: { type: "succeeded", message: { content: [{ text: "個別A型" }] } },
      },
    ]);
    const upsertPersonalTemplateDraft = vi.fn().mockResolvedValue(undefined);
    const insertNotification = vi.fn().mockResolvedValue(undefined);
    const updateGenerationJob = vi.fn().mockResolvedValue(undefined);

    await pollPersonalTemplateGenerationJobs({
      env: { ANTHROPIC_API_KEY: "test-key" } as Env,
      pendingJobs: [job],
      allJobs: [job],
      retrieveMessageBatch,
      fetchBatchResults,
      upsertPersonalTemplateDraft,
      insertNotification,
      updateGenerationJob,
    });

    expect(upsertPersonalTemplateDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        profileId: "seed-learner",
        questionNo: 101,
        draftContent: "個別A型",
      }),
    );
    expect(insertNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "seed-learner",
        type: "interview_answer_template_generated",
      }),
    );
    expect(updateGenerationJob).toHaveBeenCalledWith(
      expect.objectContaining({ id: "job-1", status: "done", succeeded: 1 }),
    );
  });

  it("discards stale batch results when a newer generation job exists", async () => {
    const staleJob = makeJob({ id: "job-old", batchId: "batch_old" });
    const latestJob = makeJob({
      id: "job-new",
      batchId: "batch_new",
      createdAt: new Date("2026-08-24T01:00:00.000Z"),
    });
    const upsertPersonalTemplateDraft = vi.fn().mockResolvedValue(undefined);
    const updateGenerationJob = vi.fn().mockResolvedValue(undefined);

    await pollPersonalTemplateGenerationJobs({
      env: { ANTHROPIC_API_KEY: "test-key" } as Env,
      pendingJobs: [staleJob],
      allJobs: [staleJob, latestJob],
      retrieveMessageBatch: vi.fn(),
      fetchBatchResults: vi.fn(),
      upsertPersonalTemplateDraft,
      insertNotification: vi.fn(),
      updateGenerationJob,
    });

    expect(upsertPersonalTemplateDraft).not.toHaveBeenCalled();
    expect(updateGenerationJob).toHaveBeenCalledWith(
      expect.objectContaining({ id: "job-old", status: "done", succeeded: 0 }),
    );
  });

  it("marks the job failed and notifies when the batch ends with errors", async () => {
    const job = makeJob({ id: "job-failed", batchId: "batch_failed" });
    const insertNotification = vi.fn().mockResolvedValue(undefined);
    const updateGenerationJob = vi.fn().mockResolvedValue(undefined);

    await pollPersonalTemplateGenerationJobs({
      env: { ANTHROPIC_API_KEY: "test-key" } as Env,
      pendingJobs: [job],
      allJobs: [job],
      retrieveMessageBatch: vi.fn().mockResolvedValue({
        id: "batch_failed",
        processing_status: "ended",
        request_counts: { succeeded: 0, errored: 1, canceled: 0, expired: 0 },
      }),
      fetchBatchResults: vi
        .fn()
        .mockResolvedValue([{ custom_id: "101", result: { type: "errored" } }]),
      upsertPersonalTemplateDraft: vi.fn(),
      insertNotification,
      updateGenerationJob,
    });

    expect(insertNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "interview_answer_template_failed",
        userId: "seed-learner",
      }),
    );
    expect(updateGenerationJob).toHaveBeenCalledWith(
      expect.objectContaining({ id: "job-failed", status: "failed", succeeded: 0 }),
    );
  });

  it("marks the job failed when Anthropic batch retrieval throws", async () => {
    const job = makeJob({ id: "job-gateway", batchId: "batch_gateway" });
    const insertNotification = vi.fn().mockResolvedValue(undefined);
    const updateGenerationJob = vi.fn().mockResolvedValue(undefined);

    await pollPersonalTemplateGenerationJobs({
      env: { ANTHROPIC_API_KEY: "test-key" } as Env,
      pendingJobs: [job],
      allJobs: [job],
      retrieveMessageBatch: vi.fn().mockRejectedValue(new Error("gateway down")),
      fetchBatchResults: vi.fn(),
      upsertPersonalTemplateDraft: vi.fn(),
      insertNotification,
      updateGenerationJob,
    });

    expect(updateGenerationJob).toHaveBeenCalledWith(
      expect.objectContaining({ id: "job-gateway", status: "failed", succeeded: 0 }),
    );
  });

  it("auto-adopts draft into content when the learner never edited the template", async () => {
    const job = makeJob({ id: "job-1", batchId: "batch_auto" });
    const upsertPersonalTemplateDraft = vi.fn().mockResolvedValue(undefined);

    await pollPersonalTemplateGenerationJobs({
      env: { ANTHROPIC_API_KEY: "test-key" } as Env,
      pendingJobs: [job],
      allJobs: [job],
      retrieveMessageBatch: vi.fn().mockResolvedValue({
        id: "batch_auto",
        processing_status: "ended",
        request_counts: { succeeded: 1, errored: 0, canceled: 0, expired: 0 },
      }),
      fetchBatchResults: vi.fn().mockResolvedValue([
        {
          custom_id: "101",
          result: { type: "succeeded", message: { content: [{ text: "自動採用案" }] } },
        },
      ]),
      existingTemplateForQuestion: async () => null,
      upsertPersonalTemplateDraft,
      insertNotification: vi.fn(),
      updateGenerationJob: vi.fn(),
    });

    expect(upsertPersonalTemplateDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        questionNo: 101,
        content: "自動採用案",
        draftContent: null,
        source: "ai",
      }),
    );
  });

  it("keeps draft separate when the current template was manually edited", async () => {
    const job = makeJob({ id: "job-2", batchId: "batch_manual" });
    const upsertPersonalTemplateDraft = vi.fn().mockResolvedValue(undefined);

    await pollPersonalTemplateGenerationJobs({
      env: { ANTHROPIC_API_KEY: "test-key" } as Env,
      pendingJobs: [job],
      allJobs: [job],
      retrieveMessageBatch: vi.fn().mockResolvedValue({
        id: "batch_manual",
        processing_status: "ended",
        request_counts: { succeeded: 1, errored: 0, canceled: 0, expired: 0 },
      }),
      fetchBatchResults: vi.fn().mockResolvedValue([
        {
          custom_id: "101",
          result: { type: "succeeded", message: { content: [{ text: "新しい生成案" }] } },
        },
      ]),
      existingTemplateForQuestion: async () => ({
        content: "手直し済み",
        source: "manual" as const,
        updatedBy: "seed-learner",
      }),
      upsertPersonalTemplateDraft,
      insertNotification: vi.fn(),
      updateGenerationJob: vi.fn(),
    });

    expect(upsertPersonalTemplateDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "手直し済み",
        draftContent: "新しい生成案",
      }),
    );
  });
});
