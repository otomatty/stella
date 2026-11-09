import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { profiles, submissions, tenants } from "../db/schema.js";
import type { Env } from "../env.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { submissionsRoute } from "./submissions.js";

describe("PATCH /api/submissions/:id のテスト確定", () => {
  let database: ReturnType<typeof sqliteD1>;
  let env: Env;
  let db: ReturnType<typeof getDb>;
  let instructorToken: string;

  beforeEach(async () => {
    database = sqliteD1();
    env = { DB: database.binding, AUTH_JWT_SECRET: "test-secret" } as unknown as Env;
    db = getDb(env);
    await db.batch([
      db.insert(tenants).values({ id: "ses", name: "テスト" }),
      db.insert(profiles).values([
        { id: "learner", displayName: "受講者", role: "student" },
        { id: "teacher", displayName: "講師", role: "instructor" },
      ]),
      db.insert(submissions).values([
        {
          id: "by-tests",
          studentId: "learner",
          taskId: "task-1",
          stageTitle: "開発ラボG",
          assignmentTitle: "計算",
          code: "",
          status: "passed",
          verdict: "pass",
          reviewSource: "tests",
          submittedAt: new Date("2026-11-01T00:00:00Z"),
        },
        {
          id: "legacy",
          studentId: "learner",
          stageTitle: "開発環境",
          assignmentTitle: "旧課題",
          code: "const x = 1;",
          status: "pending",
          submittedAt: new Date("2026-11-02T00:00:00Z"),
        },
      ]),
    ]);
    instructorToken = await signAccessToken("test-secret", "teacher", "teacher@example.com");
  });
  afterEach(() => database.sqlite.close());

  function app() {
    return mountTestApp(env, submissionsRoute).app;
  }
  async function patch(id: string, body: object) {
    return request(app(), env, `/api/submissions/${id}`, {
      method: "PATCH",
      token: instructorToken,
      body: JSON.stringify(body),
    });
  }

  it("テストで確認した提出の判定と状態は 409 で断り、行は変えない", async () => {
    for (const body of [
      { verdict: "resubmit" },
      { verdict: "fail" },
      { verdict: null },
      { status: "resubmit" },
      { status: "failed" },
      { status: "pending" },
      { verdict: "pass", status: "passed" },
    ]) {
      const response = await patch("by-tests", body);
      expect(response.status, await response.clone().text()).toBe(409);
      expect(await response.json()).toEqual({
        error: "テストで確認した提出の判定は変えられません",
      });
    }
    expect(await db.select().from(submissions).where(eq(submissions.id, "by-tests"))).toMatchObject(
      [{ verdict: "pass", status: "passed", reviewSource: "tests", reviewNotes: "" }],
    );
  });

  it("総評だけの保存は受け、テスト以外の提出の判定は今までどおり変える", async () => {
    const notes = await patch("by-tests", { reviewNotes: "コードを読んだ" });
    expect(notes.status, await notes.clone().text()).toBe(200);
    expect(await db.select().from(submissions).where(eq(submissions.id, "by-tests"))).toMatchObject(
      [{ verdict: "pass", status: "passed", reviewSource: "tests", reviewNotes: "コードを読んだ" }],
    );

    const legacy = await patch("legacy", { verdict: "pass", reviewNotes: "よい" });
    expect(legacy.status, await legacy.clone().text()).toBe(200);
    expect(await db.select().from(submissions).where(eq(submissions.id, "legacy"))).toMatchObject([
      { verdict: "pass", status: "passed", reviewSource: null },
    ]);
  });

  it("一覧はテストで合格した提出を、合格済みでも落とさず返す", async () => {
    const response = await request(app(), env, "/api/submissions", { token: instructorToken });
    expect(response.status, await response.clone().text()).toBe(200);
    const { rows } = await json<{ rows: { id: string; review_source: string | null }[] }>(response);
    expect(rows.map((row) => row.id).sort()).toEqual(["by-tests", "legacy"]);
    expect(rows.find((row) => row.id === "by-tests")).toMatchObject({ review_source: "tests" });
  });
});
