import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { LearningPace } from "@stella/shared/study/pace";
import { addStudyDays } from "@stella/shared/study/activity";
import { learningPaceRoute } from "./learning-pace.js";
import { meRoute } from "./me.js";
import { getDb } from "../db/client.js";
import { loadLearningPace, notifyPaceDelays } from "../lib/learning-pace.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import type { Env } from "../env.js";
import { mountTestApp, request, json } from "../testing/route-harness.js";

const migrationDir = fileURLToPath(new URL("../../drizzle/", import.meta.url));
const migration = readFileSync(`${migrationDir}/0044_learning_pace.sql`, "utf8");
function migrate(sqlite: DatabaseSync, includePace = true) {
  for (const name of readdirSync(migrationDir)
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    if (!includePace && name === "0044_learning_pace.sql") continue;
    for (const statement of readFileSync(`${migrationDir}/${name}`, "utf8").split(
      "--> statement-breakpoint",
    )) {
      if (statement.trim()) sqlite.exec(statement);
    }
  }
}
/** DrizzleのSQLとtriggerも実行する。権限や進捗のI/Oをmockしない。 */
function localD1(sqlite: DatabaseSync): D1Database {
  const prepare = (sql: string) => {
    let args: (string | number | null)[] = [];
    const query = {
      bind: (...values: (string | number | null)[]) => {
        args = values;
        return query;
      },
      raw: async () => {
        const s = sqlite.prepare(sql);
        s.setReturnArrays(true);
        return s.all(...args);
      },
      all: async () => ({
        results: sqlite.prepare(sql).all(...args),
        success: true,
        meta: { changes: Number(sqlite.prepare("select changes() as n").get()?.n ?? 0) },
      }),
      run: async () => ({
        results: [],
        success: true,
        meta: { changes: Number(sqlite.prepare(sql).run(...args).changes) },
      }),
    };
    return query;
  };
  return {
    prepare,
    batch: async (queries: ReturnType<typeof prepare>[]) => {
      sqlite.exec("begin");
      try {
        const result = await Promise.all(queries.map((q) => q.all()));
        sqlite.exec("commit");
        return result;
      } catch (err) {
        sqlite.exec("rollback");
        throw err;
      }
    },
  } as unknown as D1Database;
}
function seed(sqlite: DatabaseSync) {
  sqlite.exec(`
    INSERT INTO tenants (id, name, active_count, active, test_mode, created_at, updated_at) VALUES ('ses', 'SES', 0, 1, 0, 1, 1), ('other', 'Other', 0, 1, 0, 1, 1);
    INSERT INTO profiles (id, tenant_id, role, display_name, disabled, name_source, created_at) VALUES
      ('learner', 'ses', 'student', '受講者', 0, 'google', 1),
      ('teacher', 'ses', 'instructor', '担当講師', 0, 'google', 1),
      ('unassigned', 'ses', 'instructor', '別の講師', 0, 'google', 1),
      ('admin', 'ses', 'admin', '管理者', 0, 'google', 1),
      ('outsider', 'other', 'student', '他テナント', 0, 'google', 1),
      ('foreign-teacher', 'other', 'instructor', '他の講師', 0, 'google', 1);
    INSERT INTO stages (id, tenant_id, slug, title, status, format, duration_hours, audience, created_at, updated_at) VALUES
      ('root', 'ses', 'dev-env-basics', '開発環境', 'published', 2, 35, 'catalog', 1, 1);
    INSERT INTO sections (id, stage_id, title, "order", created_at) VALUES ('unit', 'root', '最初のページ', 0, 1);
    INSERT INTO content_units (section_id, planned_hours, skills, reuses, "references") VALUES ('unit', 3, '{"uses":[],"assesses":["html"]}', '[]', '[]');
    INSERT INTO lessons (id, section_id, title, type, "order", duration_label, created_at, updated_at) VALUES ('lesson', 'unit', 'コマ1', 'text', 0, '10分', 1, 1);
    INSERT INTO tasks (id, section_id, title, kind, pattern, skills, estimated_minutes, "order", content_hash, definition, bundle, active) VALUES
      ('practice', 'unit', '練習', 'basic', 'html', '{"uses":[],"assesses":["html"]}', 60, 0, 'hash', '{}', '{}', 1),
      ('A', 'unit', '確認A', 'assessment-a', 'html', '{"uses":[],"assesses":["html"]}', 30, 1, 'hash', '{}', '{}', 1),
      ('B', 'unit', '確認B', 'assessment-b', 'html', '{"uses":[],"assesses":["html"]}', 30, 2, 'hash', '{}', '{}', 1);
  `);
}
let sqlite: DatabaseSync;
let env: Env;
let app: ReturnType<typeof mountTestApp>["app"];
const learner = {
  id: "learner",
  tenantId: "ses",
  role: "student" as const,
  name: "受講者",
  email: null,
};
const token = (id = "learner") => signAccessToken("pace-test-secret", id, `${id}@example.test`);
const get = async (path: string, id = "learner") =>
  request(app, env, path, { token: await token(id) });
const write = async (path: string, body: unknown, id = "learner", method = "POST") =>
  request(app, env, path, { token: await token(id), method, body: JSON.stringify(body) });
beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  migrate(sqlite);
  seed(sqlite);
  env = { DB: localD1(sqlite), AUTH_JWT_SECRET: "pace-test-secret" } as Env;
  app = mountTestApp(env, learningPaceRoute, meRoute).app;
});
afterEach(() => sqlite.close());

describe("学習ペースのプロフィールと開始日", () => {
  it("既定35時間・開始前はnull。dev-env-basics開始を日本時間で入れる", async () => {
    expect(
      (await json<{ pace: LearningPace }>(await get("/api/learning-pace"))).pace.settings,
    ).toEqual({ weeklyHours: 35, startDate: null });
    sqlite
      .prepare(
        "insert into enrollments (id, tenant_id, user_id, stage_id, status, required, enrolled_at) values ('en', 'ses', 'learner', 'root', 'active', 0, ?)",
      )
      .run(Date.parse("2026-10-04T16:00:00Z"));
    expect(
      (await json<{ profile: Record<string, unknown> }>(await get("/api/me"))).profile
        .learning_start_date,
    ).toBe("2026-10-05");
    expect(
      sqlite.prepare("select due_at from enrollments where id = 'en'").get()?.due_at,
    ).toBeNull();
  });
  it("設定だけの更新で名前を変えず、名前だけの既存リクエストも動く", async () => {
    expect(
      (
        await write("/api/me", {
          weekly_hours: 30,
          learning_start_date: "2026-10-05",
          role: "admin",
          tenant_id: "other",
        })
      ).status,
    ).toBe(200);
    expect(
      sqlite
        .prepare(
          "select weekly_hours, display_name, name_source, role, tenant_id from profiles where id='learner'",
        )
        .get(),
    ).toEqual({
      weekly_hours: 30,
      display_name: "受講者",
      name_source: "google",
      role: "student",
      tenant_id: "ses",
    });
    expect((await write("/api/me", { display_name: "新しい名前" })).status).toBe(200);
    expect(
      sqlite.prepare("select weekly_hours, name_source from profiles where id='learner'").get(),
    ).toEqual({ weekly_hours: 30, name_source: "user" });
    expect(
      sqlite.prepare("select weekly_hours from learning_pace_changes where user_id='learner'").get()
        ?.weekly_hours,
    ).toBe(30);
  });
  it("初期設定が30時間でも、初回変更と同日の再変更で過去の期待時間を変えない", async () => {
    const today = String(sqlite.prepare("select date('now', '+9 hours') as date").get()?.date);
    sqlite
      .prepare(
        "insert into profiles (id, tenant_id, role, display_name, weekly_hours, learning_start_date, created_at) values ('custom', 'ses', 'student', '別ペース', 30, ?, 1)",
      )
      .run(addStudyDays(today, -7));
    const custom = { ...learner, id: "custom" };
    expect((await loadLearningPace(getDb(env), custom, today)).expectedMinutes).toBe(30 * 60);
    expect((await write("/api/me", { weekly_hours: 40 }, "custom")).status).toBe(200);
    expect((await loadLearningPace(getDb(env), custom, today)).expectedMinutes).toBe(30 * 60);
    expect((await write("/api/me", { weekly_hours: 45 }, "custom")).status).toBe(200);
    expect(
      sqlite
        .prepare(
          "select weekly_hours, previous_weekly_hours from learning_pace_changes where user_id='custom'",
        )
        .get(),
    ).toEqual({ weekly_hours: 45, previous_weekly_hours: 30 });
    expect((await loadLearningPace(getDb(env), custom, today)).expectedMinutes).toBe(30 * 60);
  });
  it.each([{ weekly_hours: 0 }, { weekly_hours: "35" }, { learning_start_date: "2026-02-29" }, {}])(
    "不正な設定をDBに書かない: %s",
    async (body) => {
      expect((await write("/api/me", body)).status).toBe(400);
      expect(
        sqlite.prepare("select weekly_hours from profiles where id='learner'").get()?.weekly_hours,
      ).toBe(35);
    },
  );
  it("開始日を空にすると、開始履歴に戻す。自分で指定した日は開始で上書きしない", async () => {
    await write("/api/me", { learning_start_date: "2026-09-01" });
    sqlite
      .prepare(
        "insert into enrollments (id, tenant_id, user_id, stage_id, status, required, enrolled_at) values ('en', 'ses', 'learner', 'root', 'active', 0, ?)",
      )
      .run(Date.parse("2026-10-05T00:00:00Z"));
    expect(
      sqlite.prepare("select learning_start_date from profiles where id='learner'").get()
        ?.learning_start_date,
    ).toBe("2026-09-01");
    expect((await write("/api/me", { learning_start_date: null })).status).toBe(200);
    expect(
      sqlite.prepare("select learning_start_date from profiles where id='learner'").get()
        ?.learning_start_date,
    ).toBe("2026-10-05");
  });
  it("無効化したプロフィールは既存JWTでも読書きできない", async () => {
    sqlite.exec("update profiles set disabled=1 where id='learner'");
    expect((await get("/api/me")).status).toBe(403);
    expect((await write("/api/me", { weekly_hours: 40 })).status).toBe(403);
    expect((await get("/api/learning-pace")).status).toBe(403);
  });
});

describe("担当講師の権限と開始診断", () => {
  it.each([null, [], "invalid"])("オブジェクトでない入力を400で返す: %s", async (body) => {
    for (const [path, method] of [
      ["/api/learning-pace/learner", "PATCH"],
      ["/api/learning-pace/learner/instructor", "PUT"],
      ["/api/learning-pace/learner/diagnostics", "PUT"],
    ]) {
      expect((await write(path, body, "admin", method)).status).toBe(400);
      expect(
        (
          await request(app, env, path, {
            token: await token("admin"),
            method,
            body: "{",
          })
        ).status,
      ).toBe(400);
    }
  });
  it("認証が必要で、受講者・担当外の講師・他テナントには公開しない", async () => {
    expect((await request(app, env, "/api/learning-pace")).status).toBe(401);
    expect((await get("/api/learning-pace?userId=outsider", "admin")).status).toBe(404);
    expect((await get("/api/learning-pace?userId=learner", "teacher")).status).toBe(403);
    expect((await get("/api/learning-pace/learners")).status).toBe(403);
    expect(
      (
        await write(
          "/api/learning-pace/learner/instructor",
          { instructor_id: "teacher" },
          "learner",
          "PUT",
        )
      ).status,
    ).toBe(403);
  });
  it("同じテナントの管理者が担当を設定すると、その講師だけ編集できる", async () => {
    expect(
      (
        await write(
          "/api/learning-pace/learner/instructor",
          { instructor_id: "foreign-teacher" },
          "admin",
          "PUT",
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await write(
          "/api/learning-pace/learner/instructor",
          { instructor_id: "teacher" },
          "admin",
          "PUT",
        )
      ).status,
    ).toBe(200);
    expect(
      (await write("/api/learning-pace/learner", { weekly_hours: 40 }, "teacher", "PATCH")).status,
    ).toBe(200);
    expect(
      (await write("/api/learning-pace/learner", { weekly_hours: 10 }, "unassigned", "PATCH"))
        .status,
    ).toBe(403);
    expect(
      (
        await json<{ learners: { id: string }[] }>(
          await get("/api/learning-pace/learners", "teacher"),
        )
      ).learners.map((l) => l.id),
    ).toEqual(["learner"]);
  });
  it("診断は根拠付きの担当講師・管理者の記録だけ。A・Bは削らない", async () => {
    const path = "/api/learning-pace/learner/diagnostics";
    expect(
      (await write(path, { skill_id: "html", evidence: "自己申告" }, "learner", "PUT")).status,
    ).toBe(403);
    expect((await write(path, { skill_id: "html", evidence: "" }, "admin", "PUT")).status).toBe(
      400,
    );
    expect(
      (await write(path, { skill_id: "missing", evidence: "課題を確認" }, "admin", "PUT")).status,
    ).toBe(404);
    expect(
      (
        await write(
          path,
          { skill_id: "html", evidence: "開始診断でHTML文書を自力で作成" },
          "admin",
          "PUT",
        )
      ).status,
    ).toBe(200);
    expect(await loadLearningPace(getDb(env), learner, "2026-10-05")).toMatchObject({
      skippedPracticeMinutes: 60,
      totalMinutes: 34 * 60,
      completedMinutes: 0,
    });
    expect(
      (await request(app, env, `${path}/html`, { token: await token("admin"), method: "DELETE" }))
        .status,
    ).toBe(200);
    expect((await loadLearningPace(getDb(env), learner)).skippedPracticeMinutes).toBe(0);
  });
});

describe("進捗・確認B・通知", () => {
  it("合格日はAI合格→講師確定で動かず、教材の版が変わった進捗は計算に入れない", async () => {
    sqlite
      .prepare(
        "insert into task_progress (user_id, task_id, status, content_hash, updated_at) values ('learner', 'A', 'ai-passed', 'hash', ?)",
      )
      .run(Date.parse("2026-10-05T00:00:00Z"));
    sqlite
      .prepare("update task_progress set status='passed', updated_at=? where task_id='A'")
      .run(Date.parse("2026-10-10T00:00:00Z"));
    const result = await loadLearningPace(getDb(env), learner, "2026-10-05");
    expect(result.completedMinutes).toBe(30);
    expect(result.assessments[0].dueDate).toBe("2026-10-12");
    sqlite.exec("update tasks set content_hash='new' where id='A'");
    expect(await loadLearningPace(getDb(env), learner)).toMatchObject({
      completedMinutes: 0,
      assessments: [],
    });
  });
  it("霧の中の名前・ID・コマは本人の計画レスポンスに含めない", async () => {
    sqlite.exec(`insert into stages (id, tenant_id, slug, title, status, format, duration_hours, audience, prerequisites, parent, created_at, updated_at) values
      ('next', 'ses', 'javascript-basics', '隣の講座', 'published', 2, 35, 'catalog', '["dev-env-basics"]', 'dev-env-basics', 1, 1),
      ('fog', 'ses', 'javascript-data-basics', '非公開の名前', 'published', 2, 35, 'catalog', '["javascript-basics"]', 'javascript-basics', 1, 1)`);
    const response = await get("/api/learning-pace");
    const text = await response.text();
    expect(response.status).toBe(200);
    expect(text).not.toContain("非公開の名前");
    expect(text).not.toContain("javascript-data-basics");
    expect(JSON.parse(text).pace.totalMinutes).toBe(105 * 60);
  });
  it("1週超の差だけ担当へ通知し、同じ週のcron再実行で重複しない", async () => {
    sqlite.exec(
      "insert into learner_instructors values ('learner', 'teacher'); update profiles set learning_start_date='2026-10-05' where id='learner'",
    );
    await notifyPaceDelays(getDb(env), "2026-10-12");
    expect(sqlite.prepare("select count(*) as n from notifications").get()?.n).toBe(0);
    // 1講座35時間では期待時間が飽和するため、先の講座も計算に加える。
    sqlite.exec(
      "insert into stages (id, tenant_id, slug, title, status, format, duration_hours, audience, created_at, updated_at) values ('later','ses','html-css-basics','次の講座','published',1,35,'catalog',1,1)",
    );
    await notifyPaceDelays(getDb(env), "2026-10-13");
    await notifyPaceDelays(getDb(env), "2026-10-13");
    expect(sqlite.prepare("select user_id, type from notifications").all()).toEqual([
      { user_id: "teacher", type: "learning_pace_delayed" },
    ]);
    expect(sqlite.prepare("select due_at from enrollments").all()).toEqual([]);
  });
});

describe("0044のアップグレード", () => {
  it("既存の受講履歴を開始日に移し、再開始でも戻さない", () => {
    const older = new DatabaseSync(":memory:");
    try {
      migrate(older, false);
      seed(older);
      older
        .prepare(
          "insert into enrollments (id, tenant_id, user_id, stage_id, status, required, enrolled_at) values ('en', 'ses', 'learner', 'root', 'active', 0, ?)",
        )
        .run(Date.parse("2026-10-04T16:00:00Z"));
      for (const s of migration.split("--> statement-breakpoint")) if (s.trim()) older.exec(s);
      expect(
        older
          .prepare("select weekly_hours, learning_start_date from profiles where id='learner'")
          .get(),
      ).toEqual({ weekly_hours: 35, learning_start_date: "2026-10-05" });
      expect(older.prepare("pragma foreign_key_check").all()).toEqual([]);
    } finally {
      older.close();
    }
  });
});
