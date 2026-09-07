/**
 * Issue #206 — personal answer template generation (TDD; lib not implemented yet).
 *
 * Boundary: Anthropic Message Batches + generation_jobs row on skill-sheet save.
 */

import { describe, expect, it, vi } from "vitest";

import type { Env } from "../env.js";
import {
  selectAnswerTemplateGenerationTargets,
  plainCommonAnswerTemplate,
  submitPersonalTemplateGenerationBatch,
  shouldAutoAdoptGeneratedTemplate,
  buildAnswerTemplateBatchUserPrompt,
} from "./interview-answer-template.js";

const FIXTURE_QUESTIONS = [
  { no: 101, categories: ["PHP"], freq: "A" as const },
  { no: 102, categories: ["PHP"], freq: "B" as const },
  { no: 103, categories: ["JS"], freq: "A" as const },
  { no: 104, categories: ["全案件共通"], freq: "A" as const },
];

describe("selectAnswerTemplateGenerationTargets (#206)", () => {
  it("includes only assigned category A required questions", () => {
    expect(selectAnswerTemplateGenerationTargets(FIXTURE_QUESTIONS, ["PHP"])).toEqual([101]);
  });

  it("excludes B/C frequency questions even in assigned categories", () => {
    const targets = selectAnswerTemplateGenerationTargets(FIXTURE_QUESTIONS, ["PHP"]);
    expect(targets).not.toContain(102);
  });

  it("excludes A questions outside assigned categories", () => {
    const targets = selectAnswerTemplateGenerationTargets(FIXTURE_QUESTIONS, ["PHP"]);
    expect(targets).not.toContain(103);
  });

  it("excludes common-category A questions from personal generation scope", () => {
    const targets = selectAnswerTemplateGenerationTargets(FIXTURE_QUESTIONS, ["PHP"]);
    expect(targets).not.toContain(104);
  });
});

describe("plainCommonAnswerTemplate (#206)", () => {
  it("strips blank span decorations for plain display", () => {
    expect(plainCommonAnswerTemplate('私は<span class="blank">5</span>年の経験があります')).toBe(
      "私は5年の経験があります",
    );
  });
});

describe("shouldAutoAdoptGeneratedTemplate (#206)", () => {
  it("auto-adopts when no personal template exists yet", () => {
    expect(shouldAutoAdoptGeneratedTemplate(null)).toBe(true);
  });

  it("auto-adopts when existing template was never manually edited", () => {
    expect(
      shouldAutoAdoptGeneratedTemplate({
        content: "AI 下書き",
        source: "ai",
        updatedBy: "system",
      }),
    ).toBe(true);
  });

  it("does not auto-adopt when learner or staff manually edited the template", () => {
    expect(
      shouldAutoAdoptGeneratedTemplate({
        content: "手直し済み",
        source: "manual",
        updatedBy: "seed-learner",
      }),
    ).toBe(false);
  });
});

describe("buildAnswerTemplateBatchUserPrompt (#206)", () => {
  it("includes question body, intent, NG examples, and scoring criteria", () => {
    const prompt = buildAnswerTemplateBatchUserPrompt(
      {
        no: 101,
        question: "PHP の経験年数を教えてください",
        intent: "実務経験の深さを確認したい",
        ng: "「覚えていません」だけで終わる",
        criteria: "年数と具体プロジェクトをセットで話す",
      },
      '{"sections":{}}',
    );

    expect(prompt).toContain("PHP の経験年数を教えてください");
    expect(prompt).toContain("実務経験の深さを確認したい");
    expect(prompt).toContain("「覚えていません」だけで終わる");
    expect(prompt).toContain("年数と具体プロジェクトをセットで話す");
    expect(prompt).toContain('{"sections":{}}');
  });
});

describe("submitPersonalTemplateGenerationBatch (#206)", () => {
  it("creates an Anthropic Message Batch and records a pending generation_jobs row", async () => {
    const createMessageBatch = vi.fn().mockResolvedValue({ id: "batch_abc123" });
    const insertGenerationJob = vi.fn().mockResolvedValue(undefined);

    const env = {
      ANTHROPIC_API_KEY: "test-key",
      CLOUDFLARE_ACCOUNT_ID: "0a0dd103e779842ba2c67cbde20574a0",
      AI_GATEWAY_ID: "stella-ai",
    } as Env;

    const result = await submitPersonalTemplateGenerationBatch({
      env,
      tenantId: "ses",
      profileId: "seed-learner",
      skillSheetId: "sheet-1",
      questionNos: [101],
      createMessageBatch,
      insertGenerationJob,
    });

    expect(createMessageBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        requests: expect.arrayContaining([
          expect.objectContaining({
            custom_id: "101",
            params: expect.objectContaining({
              messages: [
                expect.objectContaining({
                  content: expect.stringContaining("Question no: 101"),
                }),
              ],
            }),
          }),
        ]),
      }),
    );
    expect(insertGenerationJob).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "ses",
        profileId: "seed-learner",
        batchId: "batch_abc123",
        status: "pending",
        requested: 1,
      }),
    );
    expect(result).toMatchObject({ batchId: "batch_abc123", jobId: expect.any(String) });
  });

  it("feeds interview question metadata into the batch prompt", async () => {
    const createMessageBatch = vi.fn().mockResolvedValue({ id: "batch_meta" });

    await submitPersonalTemplateGenerationBatch({
      env: {
        ANTHROPIC_API_KEY: "test-key",
        CLOUDFLARE_ACCOUNT_ID: "0a0dd103e779842ba2c67cbde20574a0",
        AI_GATEWAY_ID: "stella-ai",
      } as Env,
      tenantId: "ses",
      profileId: "seed-learner",
      skillSheetId: "sheet-1",
      questionNos: [101],
      questions: [
        {
          no: 101,
          question: "PHP の経験年数を教えてください",
          intent: "実務経験の深さ",
          ng: "短すぎる回答",
          criteria: "年数と具体例",
        },
      ],
      createMessageBatch,
      insertGenerationJob: vi.fn(),
    });

    const call = createMessageBatch.mock.calls[0]?.[0];
    const content = call?.requests[0]?.params.messages[0]?.content;
    expect(content).toContain("PHP の経験年数を教えてください");
    expect(content).toContain("実務経験の深さ");
    expect(content).toContain("短すぎる回答");
    expect(content).toContain("年数と具体例");
  });
});
