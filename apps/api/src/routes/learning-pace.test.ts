import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LearningPace } from "@stella/shared/study/pace";
import { addStudyDays } from "@stella/shared/study/activity";
import { learningPaceRoute } from "./learning-pace.js";
import { meRoute } from "./me.js";
import { getDb } from "../db/client.js";
import {
  loadLearningPace,
  notifyPaceDelays,
  PACE_DELAY_LEARNERS_PER_RUN,
} from "../lib/learning-pace.js";
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
    INSERT INTO tenants (id, name, active_count, active, test_mode, created_at, updated_at) VALUES ('ses', 'SES', 0, 1, 0, 1, 1);
    INSERT INTO profiles (id, tenant_id, role, display_name, disabled, name_source, created_at) VALUES
      ('learner', 'ses', 'student', '受講者', 0, 'google', 1),
      ('teacher', 'ses', 'admin', '担当講師', 0, 'google', 1),
      ('unassigned', 'ses', 'admin', '別の講師', 0, 'google', 1),
      ('admin', 'ses', 'admin', '管理者', 0, 'google', 1),
      ('outsider', 'ses', 'student', '別の受講者', 0, 'google', 1),
      ('foreign-teacher', 'ses', 'admin', 'もう一人の講師', 0, 'google', 1);
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
        })
      ).status,
    ).toBe(200);
    expect(
      sqlite
        .prepare(
          "select weekly_hours, display_name, name_source, role from profiles where id='learner'",
        )
        .get(),
    ).toEqual({
      weekly_hours: 30,
      display_name: "受講者",
      name_source: "google",
      role: "student",
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

describe("学習ペースの権限と開始診断", () => {
  it.each([null, [], "invalid"])("オブジェクトでない入力を400で返す: %s", async (body) => {
    for (const [path, method] of [
      ["/api/learning-pace/learner", "PATCH"],
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
  it("認証が必要で、受講者は他人のペースを読めない", async () => {
    expect((await request(app, env, "/api/learning-pace")).status).toBe(401);
    expect((await get("/api/learning-pace?userId=outsider", "admin")).status).toBe(200);
    expect((await get("/api/learning-pace?userId=missing", "admin")).status).toBe(404);
    expect((await get("/api/learning-pace?userId=learner", "teacher")).status).toBe(200);
    expect((await get("/api/learning-pace?userId=learner", "outsider")).status).toBe(403);
    expect((await get("/api/learning-pace/learners")).status).toBe(403);
  });
  it("staff はだれでも受講者のペースを変えられ、一覧は有効な受講者全員", async () => {
    expect(
      (await write("/api/learning-pace/learner", { weekly_hours: 40 }, "teacher", "PATCH")).status,
    ).toBe(200);
    expect(
      (await write("/api/learning-pace/learner", { weekly_hours: 10 }, "unassigned", "PATCH"))
        .status,
    ).toBe(200);
    const listed = async (as: string) =>
      (
        await json<{ learners: { id: string; instructorId?: string }[] }>(
          await get("/api/learning-pace/learners", as),
        )
      ).learners;
    const teacher = await listed("teacher");
    const admin = await listed("admin");
    expect(teacher.map((l) => l.id).sort()).toEqual(["learner", "outsider"]);
    expect(admin.map((l) => l.id).sort()).toEqual(teacher.map((l) => l.id).sort());
    expect(teacher.every((l) => l.instructorId === undefined)).toBe(true);
  });
  it("診断は根拠付きの staff の記録だけ。A・Bは削らない", async () => {
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
  it.each(["not-started", "passed", "ai-passed"])(
    "問題の完了時間は今の版だけを数える (前の版の課題の状態: %s)",
    async (status) => {
      sqlite.prepare("update tasks set definition=? where id='practice'").run(
        JSON.stringify({
          problems: [
            { id: "q01-add", title: "足し算" },
            { id: "q02-sub", title: "引き算" },
          ],
        }),
      );
      sqlite
        .prepare(
          "insert into task_progress (user_id, task_id, status, content_hash, updated_at) values ('learner', 'practice', ?, 'old-hash', 1)",
        )
        .run(status);
      sqlite.exec(`
        insert into task_problem_results (user_id, task_id, problem_id, content_hash, path, code, sha256, first_passed_at, updated_at)
        values ('learner', 'practice', 'q01-add', 'old-hash', 'src/q01-add.ts', 'code', 'sha', 1, 1);
      `);
      expect((await loadLearningPace(getDb(env), learner)).completedMinutes).toBe(0);

      sqlite.exec(`
        insert into task_problem_results (user_id, task_id, problem_id, content_hash, path, code, sha256, first_passed_at, updated_at)
        values ('learner', 'practice', 'q02-sub', 'hash', 'src/q02-sub.ts', 'code', 'sha', 1, 1);
      `);
      expect((await loadLearningPace(getDb(env), learner)).completedMinutes).toBe(30);

      sqlite.exec(
        "update task_problem_results set content_hash='hash' where task_id='practice' and problem_id='q01-add'",
      );
      expect((await loadLearningPace(getDb(env), learner)).completedMinutes).toBe(60);
    },
  );

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
      ('next', 'ses', 'javascript-basics', '隣のステージ', 'published', 2, 35, 'catalog', '["dev-env-basics"]', 'dev-env-basics', 1, 1),
      ('fog', 'ses', 'javascript-data-basics', '非公開の名前', 'published', 2, 35, 'catalog', '["javascript-basics"]', 'javascript-basics', 1, 1)`);
    const response = await get("/api/learning-pace");
    const text = await response.text();
    expect(response.status).toBe(200);
    expect(text).not.toContain("非公開の名前");
    expect(text).not.toContain("javascript-data-basics");
    expect(JSON.parse(text).pace.totalMinutes).toBe(105 * 60);
  });
  it("1週超の差だけ staff 全員へ通知し、同じ週のcron再実行で重複しない", async () => {
    sqlite.exec(`
      update profiles set learning_start_date='2026-10-05' where id='learner';
      insert into enrollments (id, user_id, stage_id, tenant_id, status, enrolled_at) values ('enr-learner', 'learner', 'root', 'ses', 'active', 1);
    `);
    await notifyPaceDelays(getDb(env), "2026-10-12");
    expect(sqlite.prepare("select count(*) as n from notifications").get()?.n).toBe(0);
    // 1ステージ35時間では期待時間が飽和するため、先のステージも計算に加える。
    sqlite.exec(
      "insert into stages (id, tenant_id, slug, title, status, format, duration_hours, audience, created_at, updated_at) values ('later','ses','html-css-basics','次のステージ','published',1,35,'catalog',1,1)",
    );
    await notifyPaceDelays(getDb(env), "2026-10-13");
    await notifyPaceDelays(getDb(env), "2026-10-13");
    const staff = ["admin", "foreign-teacher", "teacher", "unassigned"];
    expect(
      sqlite.prepare("select user_id, type from notifications order by user_id").all(),
    ).toEqual(staff.map((user_id) => ({ user_id, type: "learning_pace_delayed" })));
    expect(sqlite.prepare("select due_at from enrollments").all()).toEqual([{ due_at: null }]);
  });
  it("1人の計算が失敗しても後続へ通知し、今週通知済みの組は計算し直さない", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {
      // 握り潰す。呼ばれた回数と受講者だけを確かめる。
    });
    try {
      // a-broken は先に処理される。通知の挿入だけが失敗しても、次の受講者へ進む。
      sqlite.exec(`
        insert into profiles (id, tenant_id, role, display_name, disabled, name_source, created_at) values ('a-broken', 'ses', 'student', '計算できない受講者', 0, 'google', 1);
        update profiles set learning_start_date='2026-10-05' where id in ('learner', 'a-broken');
        insert into enrollments (id, user_id, stage_id, tenant_id, status, enrolled_at) values
          ('enr-broken', 'a-broken', 'root', 'ses', 'active', 1),
          ('enr-learner', 'learner', 'root', 'ses', 'active', 1);
        insert into stages (id, tenant_id, slug, title, status, format, duration_hours, audience, created_at, updated_at) values ('later','ses','html-css-basics','次のステージ','published',1,35,'catalog',1,1);
      `);
      const db = getDb(env);
      const originalInsert = db.insert.bind(db);
      db.insert = ((table: Parameters<typeof db.insert>[0]) => {
        const query = originalInsert(table);
        const values = query.values.bind(query);
        query.values = ((row: { id?: string }) => {
          if (row.id?.startsWith("pace:a-broken:")) throw new Error("計画を計算できない");
          return values(row as never);
        }) as typeof query.values;
        return query;
      }) as typeof db.insert;
      const notified = () =>
        sqlite.prepare("select id, user_id from notifications order by id").all();
      const staff = ["admin", "foreign-teacher", "teacher", "unassigned"];
      await notifyPaceDelays(db, "2026-10-13");
      expect(notified()).toEqual(
        staff.map((userId) => ({
          id: `pace:learner:${userId}:2026-10-12`,
          user_id: userId,
        })),
      );
      expect(error).toHaveBeenCalledTimes(1);
      expect(error.mock.calls[0]?.[1]).toEqual({ learnerId: "a-broken" });
      // 同じ週は、全宛先に通知済みの受講者を計算し直さない。
      sqlite.exec(
        staff
          .map(
            (userId) =>
              `insert into notifications (id, user_id, tenant_id, type, created_at) values ('pace:a-broken:${userId}:2026-10-12', '${userId}', 'ses', 'learning_pace_delayed', 1)`,
          )
          .join(";"),
      );
      error.mockClear();
      await notifyPaceDelays(db, "2026-10-18");
      expect(error).not.toHaveBeenCalled();
      expect(notified()).toHaveLength(staff.length * 2);
      // 翌週は改めて計算する。a-broken の挿入はまた失敗し、learner だけ届く。
      await notifyPaceDelays(db, "2026-10-19");
      expect(error).toHaveBeenCalledTimes(1);
      expect(notified()).toEqual([
        ...staff.map((userId) => ({
          id: `pace:a-broken:${userId}:2026-10-12`,
          user_id: userId,
        })),
        ...staff.flatMap((userId) => [
          { id: `pace:learner:${userId}:2026-10-12`, user_id: userId },
          { id: `pace:learner:${userId}:2026-10-19`, user_id: userId },
        ]),
      ]);
    } finally {
      error.mockRestore();
    }
  });

  it("1回の起動では計画を20人までしか計算しない", async () => {
    const count = PACE_DELAY_LEARNERS_PER_RUN + 1;
    const ids = Array.from({ length: count }, (_, i) => `s${String(i).padStart(2, "0")}`);
    sqlite.exec(`
      insert into stages (id, tenant_id, slug, title, status, format, duration_hours, audience, created_at, updated_at)
        values ('later','ses','html-css-basics','次のステージ','published',1,35,'catalog',1,1);
      ${ids
        .map(
          (id) => `
        insert into profiles (id, tenant_id, role, display_name, disabled, name_source, learning_start_date, created_at)
          values ('${id}', 'ses', 'student', '受講者${id}', 0, 'google', '2026-10-05', 1);
        insert into enrollments (id, user_id, stage_id, tenant_id, status, enrolled_at)
          values ('enr-${id}', '${id}', 'root', 'ses', 'active', 1);`,
        )
        .join("\n")}
    `);
    const db = getDb(env);
    const learnersOf = () =>
      sqlite
        .prepare(
          "select distinct substr(id, 6, instr(substr(id, 6), ':') - 1) as learner from notifications order by learner",
        )
        .all()
        .map((row) => (row as { learner: string }).learner);
    const start = new Date(0);
    await notifyPaceDelays(db, "2026-10-13", start);
    expect(learnersOf()).toEqual(ids.slice(0, PACE_DELAY_LEARNERS_PER_RUN));
    await notifyPaceDelays(db, "2026-10-13", new Date(start.getTime() + 15 * 60_000));
    expect(learnersOf()).toEqual(ids);
    expect(sqlite.prepare("select count(*) as n from notifications").get()?.n).toBe(count * 4);
    expect(
      sqlite
        .prepare("select count(*) as n from notifications where id like 'pace:outsider:%'")
        .get()?.n,
    ).toBe(0);
  });

  it.each([
    { count: 21, startPage: 0 },
    { count: 21, startPage: 1 },
    { count: 41, startPage: 0 },
    { count: 41, startPage: 1 },
    { count: 41, startPage: 2 },
  ])(
    "$count人を開始ページ$startPageから続く15分の枠で重複なく全員計算する",
    async ({ count, startPage }) => {
      const ids = Array.from({ length: count }, (_, i) => `s${String(i).padStart(2, "0")}`);
      sqlite.exec(
        ids
          .map(
            (id) => `
        insert into profiles (id, tenant_id, role, display_name, disabled, name_source, created_at)
          values ('${id}', 'ses', 'student', '受講者${id}', 0, 'google', 1);
        insert into enrollments (id, user_id, stage_id, tenant_id, status, enrolled_at)
          values ('enr-${id}', '${id}', 'root', 'ses', 'active', 1);`,
          )
          .join("\n"),
      );
      // 開始日が無いので遅れの通知は出ない。計算対象からは外れず、枠のページ番号だけが誰を計算するかを決める。
      const idSet = new Set(ids);
      const calculated: string[] = [];
      let last = "";
      const note = (values: readonly unknown[]) => {
        for (const value of values) {
          if (typeof value === "string" && idSet.has(value) && value !== last) {
            calculated.push(value);
            last = value;
          }
        }
      };
      const binding = env.DB;
      const originalPrepare = binding.prepare.bind(binding);
      binding.prepare = (sql: string) => {
        const query = originalPrepare(sql);
        const originalBind = query.bind.bind(query);
        query.bind = ((...values: Parameters<typeof query.bind>) => {
          note(values);
          return originalBind(...values);
        }) as typeof query.bind;
        return query;
      };
      const take = async (now: Date) => {
        calculated.length = 0;
        last = "";
        await notifyPaceDelays(getDb(env), "2026-10-13", now);
        return [...calculated];
      };
      try {
        const pages = Math.ceil(count / PACE_DELAY_LEARNERS_PER_RUN);
        // 枠番号の剰余を明示し、最後のページから先頭へ戻る巡回も検証する。
        const startSlot = pages * 100 + startPage;
        const all: string[] = [];
        for (let offset = 0; offset < pages; offset++) {
          const batch = await take(new Date((startSlot + offset) * 15 * 60_000));
          expect(batch.length).toBeLessThanOrEqual(PACE_DELAY_LEARNERS_PER_RUN);
          expect(batch.filter((id) => all.includes(id))).toEqual([]);
          all.push(...batch);
        }
        expect(all.sort()).toEqual(ids);
        expect(sqlite.prepare("select count(*) as n from notifications").get()?.n).toBe(0);
      } finally {
        binding.prepare = originalPrepare;
      }
    },
  );
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
