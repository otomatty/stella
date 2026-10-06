import type { MessageBatchIndividualResponse } from "@anthropic-ai/sdk/resources/messages/batches.js";
import type {
  Message,
  MessageCreateParamsNonStreaming,
} from "@anthropic-ai/sdk/resources/messages/messages.js";
import type { AiReviewOutput } from "@stella/shared/review/ai-review";
import { submissionFixture } from "@stella/shared/testing/task-submission";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../../src/db/client.js";
import {
  codingRules,
  enrollments,
  lessonProgress,
  lessons,
  profiles,
  sections,
  skills,
  stages,
  submissionReviews,
  submissions,
  taskPrivate,
  taskRevisions,
  tasks,
  tenants,
} from "../../src/db/schema.js";
import type { Env } from "../../src/env.js";
import {
  AI_REVIEW_PROMPT_VERSION,
  AI_REVIEW_PROMPTS,
  isAiReviewPromptVersion,
} from "../../src/lib/ai-review-prompt.js";
import { processAiReviewQueue } from "../../src/lib/ai-review-queue.js";
import { completeJsonSchema, jsonSchemaRequestParams } from "../../src/lib/anthropic-complete.js";
import { signAccessToken } from "../../src/lib/auth-jwt.js";
import { submissionsRoute } from "../../src/routes/submissions.js";
import { mountTestApp, request } from "../../src/testing/route-harness.js";
import { sqliteD1 } from "../../src/testing/sqlite-d1.js";
import {
  EVAL_SOURCE_SQL,
  type EvalExample,
  type EvalSourceRow,
  toExample,
} from "./ai-review-eval.js";
import {
  type BatchApi,
  batchCostUsd,
  chunkBatchRequests,
  collectReplay,
  estimateTokens,
  formatDryRun,
  formatReplayReport,
  parseCandidate,
  parseEvalJsonl,
  parseReplayArgs,
  prepareReplay,
  type ReplayState,
  replayCustomId,
  replayPrepareCommand,
  subjectsOf,
} from "./ai-review-replay.js";

vi.mock("../../src/lib/anthropic-complete.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/lib/anthropic-complete.js")>();
  return { ...actual, completeJsonSchema: vi.fn() };
});
const complete = vi.mocked(completeJsonSchema);

const STUDENT = "student-7f3a";
const STUDENT_NAME = "受講者の名前";
const STUDENT_EMAIL = "learner-7f3a@example.com";
const SOLUTION =
  '<!doctype html><html><head><title>課題</title></head><body><main><h1 class="page-title">はじめてのページ</h1></main></body></html>\n';
const MODEL = "claude-sonnet-4-6";

function aiOutput(over: Partial<AiReviewOutput> = {}): AiReviewOutput {
  const evidence = [{ file: "index.html", startLine: 1, endLine: 1 }];
  return {
    rubric: [
      { id: "CR-SCOPE-01", result: "met", evidence, note: "余分な要素がありません" },
      { id: "heading", result: "met", evidence, note: "見出しがあります" },
    ],
    confidence: "high",
    findings: [],
    learnerReply: { message: "提出を確認しました。", goodPoints: [], nextSteps: [] },
    ...over,
  };
}

/** Batch の 1 件の成功 (本番の応答と同じ形の Message)。 */
function succeeded(
  output: unknown,
  stopReason: "end_turn" | "refusal" = "end_turn",
): MessageBatchIndividualResponse["result"] {
  const message = {
    id: "msg",
    type: "message",
    role: "assistant",
    model: MODEL,
    content: [{ type: "text", text: JSON.stringify(output), citations: null }],
    stop_reason: stopReason,
    stop_sequence: null,
    usage: {
      input_tokens: 1_000,
      output_tokens: 200,
      cache_read_input_tokens: 3_000,
      cache_creation_input_tokens: 500,
    },
  } as unknown as Message;
  return { type: "succeeded", message };
}

function fakeBatches(results: Record<string, MessageBatchIndividualResponse["result"]>) {
  const created: { custom_id: string; params: MessageCreateParamsNonStreaming }[][] = [];
  let status: "in_progress" | "ended" = "ended";
  const api: BatchApi = {
    create: vi.fn(async (body) => {
      created.push(body.requests);
      return { id: `batch-${created.length}` };
    }),
    retrieve: vi.fn(async (id) => ({
      id,
      processing_status: status,
      request_counts: { processing: 0, succeeded: 3, errored: 1, canceled: 0, expired: 0 },
    })),
    results: vi.fn(async () =>
      (async function* () {
        for (const [custom_id, result] of Object.entries(results)) yield { custom_id, result };
      })(),
    ),
  };
  return {
    api,
    created,
    setStatus: (s: "in_progress" | "ended") => {
      status = s;
    },
  };
}

describe("候補と引数", () => {
  it("候補は <モデル>@<指示の版>。省けば本番の既定で、登録簿に無い版は止める", () => {
    expect(parseCandidate("", MODEL)).toEqual({
      label: `${MODEL}@${AI_REVIEW_PROMPT_VERSION}`,
      model: MODEL,
      promptVersion: AI_REVIEW_PROMPT_VERSION,
    });
    expect(parseCandidate(`claude-opus-4-8@${AI_REVIEW_PROMPT_VERSION}`, MODEL).model).toBe(
      "claude-opus-4-8",
    );
    expect(parseCandidate(`@${AI_REVIEW_PROMPT_VERSION}`, MODEL).model).toBe(MODEL);
    expect(() => parseCandidate("claude-opus-4-8@2099-01-01.9", MODEL)).toThrow(
      AI_REVIEW_PROMPT_VERSION,
    );
    expect(() => parseCandidate("bad model", MODEL)).toThrow("モデル ID");
    // 登録簿は自前の版だけを引く (Object の既定のプロパティを版とみなさない)。
    expect(isAiReviewPromptVersion("toString")).toBe(false);
    expect(AI_REVIEW_PROMPTS[AI_REVIEW_PROMPT_VERSION].instructions).toContain("課題レビュー担当");
  });

  it("既定は dry-run。--run には --limit が要る", () => {
    expect(parseReplayArgs([], MODEL)).toMatchObject({
      mode: "prepare",
      run: false,
      limit: null,
      remote: false,
    });
    expect(parseReplayArgs(["--limit", "3", "--remote"], MODEL)).toMatchObject({
      run: false,
      limit: 3,
      remote: true,
    });
    expect(() => parseReplayArgs(["--run"], MODEL)).toThrow("--limit");
    expect(() => parseReplayArgs(["--run", "--limit", "0"], MODEL)).toThrow("1 以上");
    expect(() => parseReplayArgs(["--run", "--limit", "2.5"], MODEL)).toThrow("1 以上");
    expect(() => parseReplayArgs(["--runn"], MODEL)).toThrow("知らない引数");
    expect(() => parseReplayArgs(["--candidate", MODEL, "--candidate", MODEL], MODEL)).toThrow(
      "同じ候補",
    );
    expect(
      parseReplayArgs(["--run", "--limit", "5", "--candidate", "a", "--candidate", "b"], MODEL),
    ).toMatchObject({ run: true, limit: 5, candidates: [{ model: "a" }, { model: "b" }] });
    expect(parseReplayArgs(["--collect", "dir"], MODEL)).toEqual({ mode: "collect", dir: "dir" });
    expect(() => parseReplayArgs(["--collect", "dir", "--run"], MODEL)).toThrow("--collect");
  });

  it("評価用データ (JSONL) を読み、提出ごとにまとめて新しい AI の結果を本番の記録にする", () => {
    const example = (over: Partial<EvalExample>): EvalExample => ({
      aiReviewId: "r",
      submissionId: "s1",
      taskId: "c/u/t",
      taskKind: "basic",
      taskContentHash: "a".repeat(64),
      model: "m",
      promptVersion: "p1",
      thresholdVersion: "t1",
      outcome: "escalated",
      routeReasons: ["ai-unavailable"],
      confidence: null,
      proposedVerdict: null,
      failure: "timeout",
      humanVerdict: "pass",
      ...over,
    });
    const examples = parseEvalJsonl(
      [
        example({}),
        example({ submissionId: "s2" }),
        example({ outcome: "confirmed", routeReasons: [], failure: null }),
      ]
        .map((e) => JSON.stringify(e))
        .join("\n"),
    );
    const subjects = subjectsOf(examples);
    expect(subjects.map((s) => s.submissionId)).toEqual(["s1", "s2"]);
    expect(subjects[0]?.production).toMatchObject({ outcome: "confirmed", failure: null });
    expect(() => parseEvalJsonl('{"submissionId":"x"}')).toThrow("1 行目");
  });

  it("トークンと Batch の費用の目安。価格の表に無いモデルは費用を出さない", () => {
    expect(estimateTokens("abcdefg日本")).toBe(4);
    const usage = {
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      cacheReadInputTokens: 1_000_000,
      cacheCreationInputTokens: 1_000_000,
    };
    // (3 + 15 + 0.3 + 3.75) の半額
    expect(batchCostUsd("claude-sonnet-4-6", usage)).toBeCloseTo(11.025);
    expect(batchCostUsd("unknown-model", usage)).toBeNull();
    expect(batchCostUsd("toString", usage)).toBeNull();
    expect(chunkBatchRequests([1, 2, 3], { maxRequests: 2, maxBytes: 1_000 })).toEqual([
      [1, 2],
      [3],
    ]);
    expect(chunkBatchRequests(["aaaa", "bbbb"], { maxRequests: 10, maxBytes: 8 })).toEqual([
      ["aaaa"],
      ["bbbb"],
    ]);
  });
});

describe("提出に当て直す (実 SQLite / R2)", () => {
  let database: ReturnType<typeof sqliteD1>;
  let env: Env;
  let db: ReturnType<typeof getDb>;
  let fixture: Awaited<ReturnType<typeof submissionFixture>>;
  let token: string;

  beforeEach(async () => {
    database = sqliteD1();
    const objects = new Map<string, Uint8Array>();
    complete.mockReset();
    env = {
      DB: database.binding,
      AUTH_JWT_SECRET: "test-secret",
      ANTHROPIC_API_KEY: "test-key",
      SUBMISSIONS_BUCKET: {
        put: vi.fn(async (key: string, data: Uint8Array) => {
          objects.set(key, data);
        }),
        get: vi.fn(async (key: string) => {
          const data = objects.get(key);
          return data ? { arrayBuffer: async () => data.buffer } : null;
        }),
        delete: vi.fn(async () => undefined),
      },
    } as unknown as Env;
    db = getDb(env);
    fixture = await submissionFixture({ kind: "basic" });
    const definition = JSON.stringify({
      kind: "basic",
      submit: { explanation: true, debuggingRecord: false },
      skills: { assesses: ["html"] },
      review: {
        rules: [{ id: "CR-SCOPE-01", required: true }],
        rubric: [{ id: "heading", criterion: "見出しが内容を表している", required: true }],
        escalateWhen: [],
      },
    });
    await db.batch([
      db.insert(tenants).values({ id: "ses", name: "テスト" }),
      db.insert(profiles).values([
        {
          id: STUDENT,
          tenantId: "ses",
          displayName: STUDENT_NAME,
          email: STUDENT_EMAIL,
          role: "student",
        },
        { id: "teacher", tenantId: "ses", displayName: "講師", role: "instructor" },
      ]),
      db.insert(stages).values({
        id: "stage",
        tenantId: "ses",
        slug: "dev-env-basics",
        title: "開発環境",
        format: 2,
        status: "published",
      }),
      db.insert(sections).values({ id: "unit", stageId: "stage", title: "入口" }),
      db.insert(lessons).values({ id: "reading", sectionId: "unit", title: "読む", type: "text" }),
      db
        .insert(enrollments)
        .values({ tenantId: "ses", userId: STUDENT, stageId: "stage", status: "active" }),
      db.insert(skills).values({ id: "html", title: "HTML" }),
      db
        .insert(lessonProgress)
        .values({ tenantId: "ses", userId: STUDENT, lessonId: "reading", completed: true }),
      db.insert(codingRules).values({
        id: "CR-SCOPE-01",
        scope: "common",
        position: 0,
        title: "求められていない処理を残さない",
        statement: "課題で求めていない処理・要素を残していない。",
        appliesTo: "すべて",
        introducedIn: "dev-env-basics",
        contentHash: "f".repeat(64),
      }),
      db.insert(tasks).values({
        id: fixture.input.taskId,
        sectionId: "unit",
        title: "課題",
        kind: "basic",
        pattern: "page",
        skills: { uses: [], assesses: ["html"] },
        estimatedMinutes: 10,
        order: 0,
        contentHash: fixture.bundle.contentHash,
        definition,
        bundle: JSON.stringify(fixture.bundle),
      }),
      db.insert(taskRevisions).values({
        taskId: fixture.input.taskId,
        contentHash: fixture.bundle.contentHash,
        definition,
        bundle: JSON.stringify(fixture.bundle),
      }),
      db.insert(taskPrivate).values({
        taskId: fixture.input.taskId,
        files: JSON.stringify({
          "solution/index.html": Buffer.from(SOLUTION).toString("base64"),
          "review.md": Buffer.from("# よくある違反\n\n見出しを飾りに使う。").toString("base64"),
        }),
      }),
    ]);
    token = await signAccessToken("test-secret", STUDENT, STUDENT_EMAIL);
  });
  afterEach(() => database.sqlite.close());

  /** 提出して本番の AI 一次レビューを流し (人に回る結果)、人の判定を記録する。 */
  async function reviewed(humanVerdict: "pass" | "resubmit") {
    const { app } = mountTestApp(env, submissionsRoute);
    const response = await request(app, env, "/api/submissions", {
      method: "POST",
      token,
      body: JSON.stringify(fixture.input),
    });
    expect(response.status, await response.clone().text()).toBe(201);
    const { row } = (await response.json()) as { row: { id: string } };
    complete.mockResolvedValueOnce({
      text: JSON.stringify(aiOutput({ confidence: "low" })),
      stopReason: "end_turn",
      model: MODEL,
      usage: {
        inputTokens: 1,
        outputTokens: 1,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
      },
    });
    await processAiReviewQueue(env, db, { timeoutMs: 1_000, maxJobs: 5, lockWaitMs: 200 });
    await db.insert(submissionReviews).values({
      submissionId: row.id,
      source: "human",
      reviewerId: "teacher",
      verdict: humanVerdict,
      notes: "",
    });
    return row.id;
  }
  /** 評価用データ (本番の取り出しの SQL)。並びは渡した提出の順に揃える (同じ時刻の行が並びうる)。 */
  const examples = (order: string[] = []) =>
    (database.sqlite.prepare(EVAL_SOURCE_SQL).all() as unknown as EvalSourceRow[])
      .map(toExample)
      .sort((a, b) => order.indexOf(a.submissionId) - order.indexOf(b.submissionId));
  const candidates = [
    parseCandidate(MODEL, MODEL),
    parseCandidate(`claude-haiku-4-5@${AI_REVIEW_PROMPT_VERSION}`, MODEL),
  ];

  it("本番と同じ関数で素材を集め、本番と同じ要求を組み立てる", async () => {
    await reviewed("pass");
    const production = complete.mock.calls[0]?.[0];
    if (!production) throw new Error("本番の AI が呼ばれていない");
    const { items, skipped } = await prepareReplay(
      { db, env },
      subjectsOf(examples()),
      candidates,
      {
        limit: null,
      },
    );
    expect(skipped).toEqual([]);
    expect(items).toHaveLength(1);
    // 本番の候補 (同じモデル・同じ指示の版) は、本番が送った要求と 1 字も違わない。
    const sentByProduction = jsonSchemaRequestParams({
      ...production,
      model: String(production.model),
    });
    expect(sentByProduction.model).toBe(MODEL);
    expect(items[0]?.requests[0]).toEqual(sentByProduction);
    // 別のモデルの候補は、モデルだけが違う。
    expect(items[0]?.requests[1]).toEqual({ ...sentByProduction, model: "claude-haiku-4-5" });
    expect(items[0]?.judge).toMatchObject({
      kind: "basic",
      forced: [],
      lines: [
        ["index.html", 2],
        ["#explanation", 1],
        ["#local-result", 3],
      ],
    });
    // 受講者の名前・メール・ID は AI に送らない。
    const sent = JSON.stringify(items[0]?.requests);
    for (const secret of [STUDENT, STUDENT_NAME, STUDENT_EMAIL]) expect(sent).not.toContain(secret);
  });

  it("素材の版が残っていない・規則の版が食い違う・提出が無いものは判定しない。--limit は送る提出だけを数える", async () => {
    const stale = await reviewed("resubmit");
    const ruleChanged = await reviewed("pass");
    const first = await reviewed("pass");
    const second = await reviewed("resubmit");
    await db
      .update(submissions)
      .set({ taskPrivateHash: "0".repeat(64) })
      .where(eq(submissions.id, stale));
    await db
      .update(submissions)
      .set({ ruleSetHash: "1".repeat(64) })
      .where(eq(submissions.id, ruleChanged));
    const subjects = subjectsOf(examples([stale, ruleChanged, first, second]));
    expect(subjects.map((s) => s.submissionId)).toEqual([stale, ruleChanged, first, second]);
    const missing = { ...subjects[0], submissionId: "gone" } as (typeof subjects)[number];

    const { items, skipped } = await prepareReplay(
      { db, env },
      [missing, ...subjects],
      candidates,
      { limit: 1, concurrency: 2 },
    );
    expect(items.map((i) => i.subject.submissionId)).toEqual([first]);
    expect(skipped.map((s) => [s.subject.submissionId, s.failure])).toEqual([
      ["gone", "missing"],
      [stale, "stale-material"],
      [ruleChanged, "stale-material"],
    ]);
    expect(skipped[2]?.detail).toContain("コーディング規則が変わりました");
    const text = formatDryRun({ subjects: 5, items, skipped, candidates, limit: 1 });
    expect(text).toContain(
      "AI に送る提出 1 件 (--limit 1)、判定しない提出 3 件 (上限に達するまでに読んだ範囲)",
    );
    expect(text).toContain("| stale-material: ");
    expect(text).toContain(`| ${MODEL}@${AI_REVIEW_PROMPT_VERSION} | 1 |`);
  });

  it("dry-run (既定) は API の操作を作らず、--run は --limit の件数だけ Batch に投入する", async () => {
    await reviewed("pass");
    await reviewed("resubmit");
    const batches = fakeBatches({});
    const batchApi = vi.fn(() => batches.api);
    const saveState = vi.fn(() => "dir");
    const log = vi.fn();
    const deps = { bindings: { db, env }, examples: examples(), batchApi, saveState, log };
    const dry = parseReplayArgs(["--limit", "1"], MODEL);
    if (dry.mode !== "prepare") throw new Error("prepare ではない");
    expect(await replayPrepareCommand(dry, deps)).toBeNull();
    expect(batchApi).not.toHaveBeenCalled();
    expect(saveState).not.toHaveBeenCalled();
    expect(log.mock.calls.join("\n")).toContain("API は呼んでいません");
    // 引数の検査を通らない形 (上限なしの投入) は、コマンドの中でも止める。
    await expect(replayPrepareCommand({ ...dry, run: true, limit: null }, deps)).rejects.toThrow(
      "--limit",
    );
    expect(batchApi).not.toHaveBeenCalled();

    const run = parseReplayArgs(
      ["--run", "--limit", "1", "--candidate", MODEL, "--candidate", `claude-haiku-4-5`],
      MODEL,
    );
    if (run.mode !== "prepare") throw new Error("prepare ではない");
    const state = await replayPrepareCommand(run, deps);
    expect(batchApi).toHaveBeenCalledTimes(1);
    expect(batches.created).toHaveLength(1);
    expect(batches.created[0]?.map((r) => r.custom_id)).toEqual([
      replayCustomId(0, 0),
      replayCustomId(1, 0),
    ]);
    expect(state?.items).toHaveLength(1);
    expect(saveState).toHaveBeenCalledWith(state);
    // 状態 (手元のファイル) にも Batch にも、受講者の名前・メール・ID を残さない。
    for (const text of [JSON.stringify(state), JSON.stringify(batches.created)])
      for (const secret of [STUDENT, STUDENT_NAME, STUDENT_EMAIL])
        expect(text).not.toContain(secret);
  });

  it("回収した応答に本番と同じ判定を当て、候補ごとの数字を並べる", async () => {
    const pass = await reviewed("resubmit");
    const unmet = await reviewed("resubmit");
    const order = [pass, unmet];
    const batches = fakeBatches({
      // 候補 0: 1 件目は AI で確定 (人は再提出 = 危ない取りこぼし)、2 件目は必須項目を満たさない。
      [replayCustomId(0, 0)]: succeeded(aiOutput()),
      [replayCustomId(0, 1)]: succeeded(
        aiOutput({
          rubric: [
            {
              id: "CR-SCOPE-01",
              result: "unmet",
              evidence: [{ file: "index.html", startLine: 1, endLine: 1 }],
              note: "余分な要素",
            },
            {
              id: "heading",
              result: "met",
              evidence: [{ file: "index.html", startLine: 1, endLine: 1 }],
              note: "",
            },
          ],
        }),
      ),
      // 候補 1: 1 件目は拒否 (AI が判定できない = 人に回る)、2 件目は呼び出しの失敗 (母数から外す)。
      [replayCustomId(1, 0)]: succeeded({}, "refusal"),
      [replayCustomId(1, 1)]: {
        type: "errored",
        error: {
          type: "error",
          error: { type: "overloaded_error", message: "overloaded" },
          request_id: null,
        },
      } as MessageBatchIndividualResponse["result"],
    });
    const run = parseReplayArgs(
      ["--run", "--limit", "10", "--candidate", MODEL, "--candidate", "claude-haiku-4-5"],
      MODEL,
    );
    if (run.mode !== "prepare") throw new Error("prepare ではない");
    let saved: ReplayState | null = null;
    await replayPrepareCommand(run, {
      bindings: { db, env },
      examples: examples(order),
      batchApi: () => batches.api,
      saveState: (state) => {
        // 回収は手元のファイルから読み直す (JSON にして戻しても判定できる)。
        saved = JSON.parse(JSON.stringify(state)) as ReplayState;
        return "dir";
      },
      log: () => undefined,
    });
    if (!saved) throw new Error("状態が保存されていない");
    const state: ReplayState = saved;
    expect(state.items.map((i) => i.subject.submissionId)).toEqual([pass, unmet]);

    batches.setStatus("in_progress");
    const pending = await collectReplay(batches.api, state);
    expect(pending.status).toBe("pending");
    expect(batches.api.results).not.toHaveBeenCalled();

    batches.setStatus("ended");
    const collected = await collectReplay(batches.api, state);
    if (collected.status !== "ended") throw new Error("回収できていない");
    const { report } = collected;
    const [production, sonnet, haiku] = report.summaries;
    expect(production).toMatchObject({
      label: "本番の記録",
      model: MODEL,
      examples: 2,
      confirmed: 0,
      reasons: { "low-confidence": { escalated: 2, humanPassed: 0 } },
    });
    expect(sonnet).toMatchObject({
      label: `${MODEL}@${AI_REVIEW_PROMPT_VERSION}`,
      examples: 2,
      callErrors: 0,
      judged: 2,
      agreement: 0.5,
      confirmed: 1,
      confirmedRate: 0.5,
      riskyConfirmed: 1,
      riskyConfirmedRate: 1,
      aiFailures: 0,
      reasons: { "rubric-unmet": { escalated: 1, humanPassed: 0 } },
      escalatedHumanPassed: 0,
      usage: {
        inputTokens: 2_000,
        outputTokens: 400,
        cacheReadInputTokens: 6_000,
        cacheCreationInputTokens: 1_000,
      },
    });
    expect(sonnet?.cost).toBeCloseTo(
      (0.5 * (2_000 * 3 + 1_000 * 3.75 + 6_000 * 0.3 + 400 * 15)) / 1e6,
    );
    expect(sonnet?.tasksOverEscalation).toEqual([
      { taskId: fixture.input.taskId, reviewed: 2, escalated: 1, rate: 0.5 },
    ]);
    expect(haiku).toMatchObject({
      examples: 1,
      callErrors: 1,
      judged: 0,
      agreement: null,
      confirmed: 0,
      aiFailures: 1,
      reasons: { "ai-unavailable": { escalated: 1, humanPassed: 0 } },
    });
    expect(report.rows[1]?.candidates[1]).toEqual({
      decision: null,
      callError: "errored:overloaded_error",
      usage: null,
    });
    const markdown = formatReplayReport(report);
    expect(markdown).toContain("| 本番の記録 |");
    expect(markdown).toContain(
      `| ${MODEL}@${AI_REVIEW_PROMPT_VERSION} | ${MODEL} | ${AI_REVIEW_PROMPT_VERSION} | 2 | 0 | 2 | 50.0% | 50.0% (1) | 100.0% (1) | 0 |`,
    );
    expect(markdown).toContain("| 必須項目に「満たさない」がある | 0 | 1 (0) | 0 |");
    // 結果には提出 ID・課題・判定だけを残す (受講者・提出の本文・AI の文は残さない)。
    const saved2 = JSON.stringify(report);
    for (const secret of [STUDENT, STUDENT_NAME, STUDENT_EMAIL, "hello", "提出を確認しました"])
      expect(saved2).not.toContain(secret);
  });
});
