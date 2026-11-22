import type { SubmissionReference } from "@stella/shared/review/types";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "../db/client.js";
import {
  profiles,
  sections,
  stages,
  submissions,
  taskPrivate,
  taskPrivateVersions,
  tasks,
  tenants,
} from "../db/schema.js";
import type { Env } from "../env.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { submissionsRoute } from "./submissions.js";

const secret = "test-secret";
const submittedSolution = "// 提出時の解答例";
const submittedGuide = "# 提出時のレビューの観点";
const latestSolution = "// 最新の解答例";

function privateFiles(files: Record<string, string | Uint8Array>): string {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(files).map(([path, value]) => [
        path,
        (typeof value === "string" ? Buffer.from(value, "utf8") : Buffer.from(value)).toString(
          "base64",
        ),
      ]),
    ),
  );
}

describe("GET /api/submissions/:id/reference", () => {
  let database: ReturnType<typeof sqliteD1>;
  let env: Env;
  let db: ReturnType<typeof getDb>;

  beforeEach(async () => {
    database = sqliteD1();
    env = { DB: database.binding, AUTH_JWT_SECRET: secret } as unknown as Env;
    db = getDb(env);
    const task = {
      sectionId: "unit",
      title: "課題",
      kind: "basic",
      pattern: "page",
      estimatedMinutes: 10,
      order: 0,
      contentHash: "content",
      definition: "{}",
      bundle: "{}",
    };
    const submission = {
      studentId: "learner",
      stageTitle: "開発環境",
      assignmentTitle: "課題",
      code: "",
    };
    await db.batch([
      db.insert(tenants).values({ id: "ses", name: "テスト" }),
      db.insert(profiles).values([
        { id: "admin", displayName: "管理者", role: "admin" },
        { id: "learner", displayName: "提出者", role: "student" },
        { id: "other", displayName: "別の受講者", role: "student" },
      ]),
      db.insert(stages).values({ id: "stage", slug: "stage", title: "開発環境" }),
      db.insert(sections).values({ id: "unit", stageId: "stage", title: "単元" }),
      db.insert(tasks).values([
        { ...task, id: "task" },
        { ...task, id: "other-task" },
      ]),
      db.insert(submissions).values([
        { ...submission, id: "submitted", taskId: "task", taskPrivateHash: "submitted-hash" },
        { ...submission, id: "no-hash", taskId: "task" },
        { ...submission, id: "missing-version", taskId: "task", taskPrivateHash: "other-hash" },
        { ...submission, id: "legacy" },
      ]),
      db.insert(taskPrivateVersions).values([
        {
          taskId: "task",
          privateHash: "submitted-hash",
          files: privateFiles({
            "solution/src/checks.js": submittedSolution,
            "solution/index.html": "<main>見本</main>",
            "solution/nul.bin": "\u0000",
            "solution/invalid-utf8.bin": Uint8Array.of(255),
            "review.md": submittedGuide,
            "variants/test/solution/index.html": "variant",
            "mutants/test/index.html": "mutant",
            "hints.md": "hint",
            "explanation.md": "explanation",
          }),
        },
        {
          taskId: "other-task",
          privateHash: "other-hash",
          files: privateFiles({ "solution/index.html": "別の課題" }),
        },
      ]),
      db.insert(taskPrivate).values({
        taskId: "task",
        files: privateFiles({ "solution/src/checks.js": latestSolution }),
      }),
    ]);
  });
  afterEach(() => database.sqlite.close());

  async function get(path: string, viewer = "admin") {
    const { app } = mountTestApp(env, submissionsRoute);
    const token = await signAccessToken(secret, viewer, `${viewer}@example.com`);
    return request(app, env, `/api/submissions/${path}`, { token });
  }

  it("提出時の版からテキストの解答例とレビューの観点だけを返す", async () => {
    const response = await get("submitted/reference");
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await json<SubmissionReference>(response)).toEqual({
      available: true,
      version: "submitted",
      files: [
        { path: "index.html", text: "<main>見本</main>" },
        { path: "src/checks.js", text: submittedSolution },
      ],
      reviewGuide: submittedGuide,
    });
  });

  it.each(["learner", "other"])("受講者 (%s) には 403 を返す", async (viewer) => {
    const response = await get("submitted/reference", viewer);
    expect(response.status).toBe(403);
    expect(await json(response)).toEqual({ error: "権限がありません" });
  });

  it("管理者が存在しない提出を指定すると 404 を返す", async () => {
    expect((await get("missing/reference")).status).toBe(404);
  });

  it.each(["no-hash", "missing-version"])(
    "提出時の版が分からないとき (%s) は今の版を返す",
    async (id) => {
      const response = await get(`${id}/reference`);
      expect(response.status).toBe(200);
      expect(await json<SubmissionReference>(response)).toEqual({
        available: true,
        version: "latest",
        note: "提出時の版が分からないため、今の版の解答例を表示しています",
        files: [{ path: "src/checks.js", text: latestSolution }],
        reviewGuide: "",
      });
    },
  );

  it("提出時の版も今の版も無ければ利用できない理由を返す", async () => {
    await db.delete(taskPrivate).where(eq(taskPrivate.taskId, "task"));
    const response = await get("missing-version/reference");
    expect(response.status).toBe(200);
    expect(await json<SubmissionReference>(response)).toEqual({
      available: false,
      reason: "この課題の解答例が見つかりません",
    });
  });

  it("旧形式の提出では利用できない理由を返す", async () => {
    const response = await get("legacy/reference");
    expect(response.status).toBe(200);
    expect(await json<SubmissionReference>(response)).toEqual({
      available: false,
      reason: "旧形式の提出には参考の書き方がありません",
    });
  });

  it.each(["submitted", "mine"])(
    "受講者の既存の提出 API (%s) に参考素材を含めない",
    async (path) => {
      const response = await get(path, "learner");
      expect(response.status).toBe(200);
      const body = await response.text();
      for (const secretText of [submittedSolution, submittedGuide, latestSolution, "reviewGuide"]) {
        expect(body).not.toContain(secretText);
      }
    },
  );
});
