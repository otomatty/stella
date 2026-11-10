import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FIRST_TASK_ID, type FirstSteps } from "@stella/shared/study/first-steps";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { mountTestApp, request, json } from "../testing/route-harness.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import type { Env } from "../env.js";
import { onboardingRoute } from "./onboarding.js";

let database: ReturnType<typeof sqliteD1>;
let env: Env;
let app: ReturnType<typeof mountTestApp>["app"];
async function get(id = "learner", path = "/api/onboarding/first-steps") {
  return request(app, env, path, {
    token: await signAccessToken("test-secret", id, `${id}@example.test`),
  });
}
beforeEach(() => {
  database = sqliteD1();
  database.sqlite.exec(`
    INSERT INTO tenants (id, name, created_at, updated_at) VALUES ('ses', 'SES', 1, 1);
    INSERT INTO profiles (id, tenant_id, role, display_name, created_at) VALUES
      ('learner', 'ses', 'student', '受講者', 1),
      ('other', 'ses', 'student', '他の受講者', 1),
      ('teacher', 'ses', 'admin', '講師', 1),
      ('other-teacher', 'ses', 'admin', '別の講師', 1),
      ('admin', 'ses', 'admin', '管理者', 1);
    INSERT INTO stages (id, tenant_id, slug, title, created_at, updated_at) VALUES ('root', 'ses', 'dev-env-basics', '入口', 1, 1), ('other-stage', 'ses', 'other', '他', 1, 1);
    INSERT INTO sections (id, stage_id, title, "order", created_at) VALUES ('unit', 'root', '単元', 0, 1), ('other-unit', 'other-stage', '他', 0, 1);
    INSERT INTO lessons (id, section_id, title, type, "order", duration_label, created_at, updated_at) VALUES
      ('lesson', 'unit', '読む', 'text', 0, '1分', 1, 1), ('lesson2', 'unit', '読む2', 'text', 1, '1分', 1, 1), ('other-lesson', 'other-unit', '他', 'text', 0, '1分', 1, 1);
    INSERT INTO tasks (id, section_id, title, kind, pattern, skills, estimated_minutes, "order", content_hash, definition, bundle) VALUES
      ('${FIRST_TASK_ID}', 'unit', '課題', 'basic', 'html', '{"uses":[],"assesses":[]}', 10, 0, 'hash', '{}', '{}');
  `);
  env = { DB: database.binding, AUTH_JWT_SECRET: "test-secret" } as Env;
  app = mountTestApp(env, onboardingRoute).app;
});
afterEach(() => database.sqlite.close());
function submit(
  id: string,
  student: string,
  at: number,
  verdict: string | null = null,
  reviewed: number | null = null,
  task = FIRST_TASK_ID,
  source = "ai",
) {
  database.sqlite
    .prepare(
      `INSERT INTO submissions (id, tenant_id, student_id, task_id, stage_title, assignment_title, code, submitted_at, verdict, reviewed_at, review_source) VALUES (?, 'ses', ?, ?, '入口', '課題', '', ?, ?, ?, ?)`,
    )
    .run(id, student, task, at, verdict, reviewed, source);
}

describe("onboarding first steps", () => {
  it("未認証は拒否し、本人の空の記録を返す。query の他人 ID は使わない", async () => {
    expect((await request(app, env, "/api/onboarding/first-steps")).status).toBe(401);
    submit("other-result", "other", 1, "pass", 2);
    const data = await json<FirstSteps>(
      await get("learner", "/api/onboarding/first-steps?userId=other"),
    );
    expect(data.stage_id).toBe("root");
    expect(data.stage_started).toBe(false);
    expect(data.items).toHaveLength(5);
    expect(data.items.every((item) => !item.done && item.at === null)).toBe(true);
  });
  it.each([
    ["teacher", 200],
    ["other-teacher", 200],
    ["admin", 200],
    ["other", 403],
  ] as const)("%s の閲覧権限 (%s)", async (id, status) => {
    expect((await get(id, "/api/onboarding/first-steps/learner")).status).toBe(status);
  });
  it("講師本人も /mine と同じく自分の記録を読める", async () => {
    expect((await get("teacher")).status).toBe(200);
  });
  it("本人・最初のステージ・最初の課題だけを使い、最初の日時を返す", async () => {
    database.sqlite.exec(`
      INSERT INTO enrollments (id, tenant_id, user_id, stage_id, enrolled_at) VALUES ('enrolled', 'ses', 'learner', 'root', 1);
      INSERT INTO lesson_progress (id, tenant_id, user_id, lesson_id, completed, updated_at) VALUES
        ('p1', 'ses', 'learner', 'lesson', 1, 20), ('p2', 'ses', 'learner', 'lesson2', 1, 10),
        ('p3', 'ses', 'learner', 'other-lesson', 1, 1), ('p4', 'ses', 'other', 'lesson', 1, 1);
      INSERT INTO auth_vscode_links (id, user_id, code_hash, expires_at, used_at, created_at) VALUES
        ('l1', 'learner', 'h1', 1, 30, 1), ('l2', 'learner', 'h2', 1, 25, 1),
        ('l3', 'other', 'h3', 1, 1, 1), ('l4', 'learner', 'h4', 9999999999, null, 1);
      INSERT INTO task_local_runs (tenant_id, user_id, task_id, content_hash, failed_runs, last_outcome, first_run_at, last_run_at) VALUES ('ses', 'learner', '${FIRST_TASK_ID}', 'hash', 1, 'failed', 40, 50);
    `);
    submit("s1", "learner", 60);
    submit("s2", "learner", 70, "resubmit", 80);
    submit("s3", "learner", 75, "pass", 90, FIRST_TASK_ID, "human");
    submit("other", "other", 1, "pass", 2);
    submit("different-task", "learner", 1, "pass", 2, "other-task");
    const data = await json<FirstSteps>(await get());
    expect(data.stage_started).toBe(true);
    expect(data.items.map((item) => item.done)).toEqual([true, true, true, true, true]);
    expect(data.items.map((item) => item.at)).toEqual(
      [10, 25, 40, 60, 80].map((sec) => new Date(sec).toISOString()),
    );
  });
  it("未完了・未使用・実行0回・判定待ちは到達にしない", async () => {
    database.sqlite.exec(`
      INSERT INTO lesson_progress (id, tenant_id, user_id, lesson_id, completed, updated_at) VALUES ('p', 'ses', 'learner', 'lesson', 0, 1);
      INSERT INTO auth_vscode_links (id, user_id, code_hash, expires_at, created_at) VALUES ('l', 'learner', 'h', 99, 1);
      INSERT INTO task_local_runs (tenant_id, user_id, task_id, content_hash, last_outcome, first_run_at, last_run_at) VALUES ('ses', 'learner', '${FIRST_TASK_ID}', 'hash', 'error', 1, 1);
    `);
    submit("pending", "learner", 2, null, 3);
    const data = await json<FirstSteps>(await get());
    expect(data.items.map((item) => item.done)).toEqual([false, false, false, true, false]);
  });
  it.each(["ai", "human"])("%s の確定した合格も結果に数える", async (source) => {
    submit("s", "learner", 1, "pass", 2, FIRST_TASK_ID, source);
    expect((await json<FirstSteps>(await get())).items[4].done).toBe(true);
  });
  it("判定日時のない旧記録も verdict があれば確定済み", async () => {
    submit("old", "learner", 1, "resubmit");
    const data = await json<FirstSteps>(await get());
    expect(data.items[4]).toEqual({ key: "got-result", done: true, at: null });
  });
});
