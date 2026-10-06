import { describe, expect, it } from "vitest";
import { getDb } from "../../src/db/client.js";
import {
  aiReviews,
  profiles,
  submissionChecks,
  submissionReviews,
  submissions,
  tenants,
} from "../../src/db/schema.js";
import type { Env } from "../../src/env.js";
import { sqliteD1 } from "../../src/testing/sqlite-d1.js";
import {
  EVAL_SOURCE_SQL,
  type EvalSourceRow,
  formatAgreementTable,
  summarizeAgreement,
  toExample,
} from "./ai-review-eval.js";
import { subjectsOf } from "./ai-review-replay.js";

function row(over: Partial<EvalSourceRow>): EvalSourceRow {
  return {
    ai_review_id: crypto.randomUUID(),
    submission_id: crypto.randomUUID(),
    task_id: "c/u/t",
    task_kind: "basic",
    task_content_hash: "a".repeat(64),
    outcome: "confirmed",
    route_reasons: "[]",
    confidence: "high",
    proposed_verdict: "pass",
    failure: null,
    model: "model-a",
    prompt_version: "p1",
    threshold_version: "t1",
    human_verdict: "pass",
    ...over,
  };
}

describe("人の判定との一致率", () => {
  it("モデル・指示・しきい値の版ごとにまとめ、見直しの目安を出す", () => {
    const examples = [
      row({}),
      row({ confidence: "medium", human_verdict: "resubmit" }),
      row({
        outcome: "escalated",
        route_reasons: '["rubric-unmet"]',
        proposed_verdict: "resubmit",
        human_verdict: "resubmit",
      }),
      row({
        outcome: "escalated",
        proposed_verdict: null,
        failure: "timeout",
        route_reasons: "x",
        human_verdict: "resubmit",
      }),
      row({
        model: "model-b",
        outcome: "escalated",
        proposed_verdict: "pass",
        human_verdict: "pass",
      }),
    ].map(toExample);
    expect(examples[3]?.routeReasons).toEqual([]);
    const [b, a] = summarizeAgreement(examples);
    expect(a).toMatchObject({
      model: "model-a",
      examples: 4,
      judged: 3,
      agreement: 2 / 3,
      confirmedOverturned: 1 / 2,
      practiceMediumOverturned: 1,
      escalatedHumanPassed: 0,
      failures: 1,
    });
    expect(b).toMatchObject({ model: "model-b", agreement: 1, escalatedHumanPassed: 1 });
    const table = formatAgreementTable([a, b].filter((x) => x !== undefined));
    expect(table).toContain("| model-a | p1 | t1 | 4 | 3 | 66.7% | 50.0% | 100.0% | 0.0% | 1 |");
  });
  it("統合・確認の「中」は練習の目安に数えない", () => {
    const [summary] = summarizeAgreement(
      [row({ task_kind: "assessment-a", confidence: "medium", human_verdict: "fail" })].map(
        toExample,
      ),
    );
    expect(summary?.practiceMediumOverturned).toBeNull();
    expect(summary?.confirmedOverturned).toBe(1);
  });
});

describe("評価用データの取り出し (EVAL_SOURCE_SQL)", () => {
  it("人の判定を提出ごとに 1 件に絞り、事後確認で認めた AI の合格を合格として含める", async () => {
    const database = sqliteD1();
    const db = getDb({ DB: database.binding } as unknown as Env);
    try {
      await db.batch([
        db.insert(tenants).values({ id: "ses", name: "テスト" }),
        db
          .insert(profiles)
          .values({ id: "teacher", tenantId: "ses", displayName: "講師", role: "instructor" }),
        db.insert(submissions).values(
          ["same-time", "checked", "unreviewed", "overturned"].map((id) => ({
            id,
            tenantId: "ses",
            stageTitle: "講座",
            assignmentTitle: "課題",
            code: "",
            taskId: "c/u/t",
          })),
        ),
      ]);
      const at = new Date("2026-10-01T00:00:00Z");
      const review = (submissionId: string, outcome: "confirmed" | "escalated") => ({
        id: `ai-${submissionId}`,
        submissionId,
        tenantId: "ses",
        taskId: "c/u/t",
        taskContentHash: "a".repeat(64),
        taskKind: "basic",
        outcome,
        proposedVerdict: "pass" as const,
        disposition: "applied" as const,
        promptVersion: "p1",
        thresholdVersion: "t1",
        createdAt: at,
      });
      const human = (submissionId: string, verdict: "pass" | "resubmit", createdAt = at) => ({
        submissionId,
        source: "human" as const,
        reviewerId: "teacher",
        verdict,
        notes: "",
        createdAt,
      });
      await db.batch([
        db
          .insert(aiReviews)
          .values([
            review("same-time", "escalated"),
            review("checked", "confirmed"),
            review("unreviewed", "confirmed"),
            review("overturned", "confirmed"),
          ]),
        // 同じ時刻の人の判定が 2 件ある (時刻の最大で結合すると 2 行に重なっていた)。
        db
          .insert(submissionReviews)
          .values([
            human("same-time", "pass"),
            human("same-time", "resubmit"),
            { ...human("checked", "pass"), source: "ai" as const, reviewerId: null },
            human("overturned", "resubmit", new Date(at.getTime() + 60_000)),
          ]),
        db.insert(submissionChecks).values([
          { tenantId: "ses", submissionId: "checked", result: "confirmed", createdAt: at },
          { tenantId: "ses", submissionId: "checked", result: "commented", createdAt: at },
          { tenantId: "ses", submissionId: "overturned", result: "confirmed", createdAt: at },
          { tenantId: "ses", submissionId: "overturned", result: "overturned", createdAt: at },
        ]),
      ]);
      const rows = database.sqlite.prepare(EVAL_SOURCE_SQL).all() as unknown as EvalSourceRow[];
      const bySubmission = new Map(rows.map((r) => [r.submission_id, r.human_verdict]));
      expect(rows).toHaveLength(3);
      expect(rows.filter((r) => r.submission_id === "same-time")).toHaveLength(1);
      // 人のレビューが無く、事後確認で確認済みにした AI の合格は合格とみなす (AI の判定の行は除く)。
      expect(bySubmission.get("checked")).toBe("pass");
      // 人が覆したら、事後確認の「確認済み」より人の判定を使う。
      expect(bySubmission.get("overturned")).toBe("resubmit");
      expect(bySubmission.has("unreviewed")).toBe(false);
    } finally {
      database.sqlite.close();
    }
  });

  it("同じ時刻の AI の結果は記録した順に並べ、リプレイは後に記録した方を本番の記録にする", async () => {
    const database = sqliteD1();
    const db = getDb({ DB: database.binding } as unknown as Env);
    try {
      await db.batch([
        db.insert(tenants).values({ id: "ses", name: "テスト" }),
        db
          .insert(profiles)
          .values({ id: "teacher", tenantId: "ses", displayName: "講師", role: "instructor" }),
        db.insert(submissions).values({
          id: "same-time",
          tenantId: "ses",
          stageTitle: "講座",
          assignmentTitle: "課題",
          code: "",
          taskId: "c/u/t",
        }),
      ]);
      const at = new Date("2026-10-01T00:00:00Z");
      const review = (id: string, outcome: "confirmed" | "escalated") => ({
        id,
        submissionId: "same-time",
        tenantId: "ses",
        taskId: "c/u/t",
        taskContentHash: "a".repeat(64),
        taskKind: "basic",
        outcome,
        proposedVerdict: "pass" as const,
        promptVersion: "p1",
        thresholdVersion: "t1",
        createdAt: at,
      });
      // ID (UUID) の並びと記録した順を逆にしておく。後に記録したのは "a-later"。
      await db.insert(aiReviews).values(review("z-earlier", "escalated"));
      await db.insert(aiReviews).values(review("a-later", "confirmed"));
      await db.insert(submissionReviews).values({
        submissionId: "same-time",
        source: "human",
        reviewerId: "teacher",
        verdict: "pass",
        notes: "",
        createdAt: at,
      });
      const rows = database.sqlite.prepare(EVAL_SOURCE_SQL).all() as unknown as EvalSourceRow[];
      expect(rows.map((r) => r.ai_review_id)).toEqual(["z-earlier", "a-later"]);
      const [subject] = subjectsOf(rows.map(toExample));
      expect(subject?.production.outcome).toBe("confirmed");
    } finally {
      database.sqlite.close();
    }
  });
});
