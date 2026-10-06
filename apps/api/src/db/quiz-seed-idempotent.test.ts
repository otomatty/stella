/**
 * 教材 seed を 2 回流しても復習カードが残ることと、
 * クイズの子表を外部キー列で消す計画が全表スキャンにならないこと。
 *
 * 設問の delete は quiz_options と review_cards へ cascade する。索引が無いと
 * 子表を全走査し、毎回 delete → insert だとカードも消える。
 */

import { execSync } from "node:child_process";
import { closeSync, mkdtempSync, openSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

import { splitSqlStatements } from "../../scripts/lib/d1-remote.js";
import type { Env } from "../env.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import { getDb } from "./client.js";
import { tasksRoute } from "../routes/tasks.js";
import { quizRoute } from "../routes/quiz.js";
import { srsRoute } from "../routes/srs.js";
import { mountTestApp, request, json } from "../testing/route-harness.js";
import { taskCompletionCounts } from "../lib/task-completion.js";
import type { TaskBundle, TaskSummary } from "@stella/shared/tasks/catalog";

const HERE = dirname(fileURLToPath(import.meta.url));
const DRIZZLE_DIR = join(HERE, "../../drizzle");
const REPO_ROOT = join(HERE, "../../../..");

const FK_INDEXES = [
  "sections_stage_id_idx",
  "lessons_section_id_idx",
  "lesson_materials_lesson_id_idx",
  "quizzes_lesson_id_idx",
  "quiz_questions_quiz_id_idx",
  "quiz_options_question_id_idx",
  "review_cards_question_id_idx",
  "review_logs_card_id_idx",
  "quiz_attempts_quiz_id_idx",
] as const;

interface JournalEntry {
  idx: number;
  tag: string;
}

function journalTags(): string[] {
  const journal = JSON.parse(readFileSync(join(DRIZZLE_DIR, "meta/_journal.json"), "utf8")) as {
    entries: JournalEntry[];
  };
  return [...journal.entries].sort((a, b) => a.idx - b.idx).map((entry) => entry.tag);
}

function applyMigration(db: DatabaseSync, tag: string): void {
  const sql = readFileSync(join(DRIZZLE_DIR, `${tag}.sql`), "utf8");
  for (const statement of sql.split("--> statement-breakpoint")) {
    const trimmed = statement.trim();
    if (trimmed !== "") db.exec(trimmed);
  }
}

function migratedDb(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("pragma foreign_keys = off");
  for (const tag of journalTags()) applyMigration(db, tag);
  db.exec("pragma foreign_keys = on");
  return db;
}

function planOf(db: DatabaseSync, sql: string): string {
  const rows = db.prepare(`explain query plan ${sql}`).all() as { detail: string }[];
  return rows.map((row) => row.detail).join("\n");
}

function applyScript(db: DatabaseSync, sql: string): void {
  for (const statement of splitSqlStatements(sql)) {
    try {
      db.exec(statement);
    } catch (error) {
      const preview = statement.slice(0, 180).replaceAll(/\s+/g, " ");
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`${message}\n${preview}`, { cause: error });
    }
  }
}

function loadContentSeedSql(): string {
  const dir = mkdtempSync(join(tmpdir(), "stella-quiz-seed-"));
  const file = join(dir, "seed.sql");
  const fd = openSync(file, "w");
  try {
    execSync("bun run packages/shared/scripts/export-seed-sql.ts", {
      cwd: REPO_ROOT,
      stdio: ["ignore", fd, "inherit"],
      env: { ...process.env, DIALECT: "sqlite", CONTENT_ONLY: "1" },
    });
    return readFileSync(file, "utf8");
  } finally {
    closeSync(fd);
    rmSync(dir, { recursive: true, force: true });
  }
}

function countOf(db: DatabaseSync, table: string): number {
  const row = db.prepare(`select count(*) as n from ${table}`).get() as { n: number };
  return row.n;
}

/** Workers の SQL を実際の SQLite で実行する最小の D1 アダプター。 */
function localD1(db: DatabaseSync): D1Database {
  const prepare = (sql: string) => {
    let values: (string | number | null)[] = [];
    const query = {
      bind: (...args: (string | number | null)[]) => {
        values = args;
        return query;
      },
      raw: async () => {
        const stmt = db.prepare(sql);
        stmt.setReturnArrays(true);
        return stmt.all(...values);
      },
      all: async () => ({
        results: db.prepare(sql).all(...values),
        success: true,
        meta: { changes: Number(db.prepare("select changes() as n").get()?.n ?? 0) },
      }),
      run: async () => ({
        success: true,
        results: [],
        meta: { changes: Number(db.prepare(sql).run(...values).changes) },
      }),
    };
    return query;
  };
  return {
    prepare,
    batch: async (queries: ReturnType<typeof prepare>[]) => {
      db.exec("begin");
      try {
        const rows = [];
        for (const q of queries) rows.push(await q.all());
        db.exec("commit");
        return rows;
      } catch (err) {
        db.exec("rollback");
        throw err;
      }
    },
  } as unknown as D1Database;
}

describe("外部キーの子側に索引がある", () => {
  const db = migratedDb();

  it("子表を外部キー列で消す計画が索引を使う", () => {
    const names = db.prepare("select name from sqlite_master where type = 'index'").all() as {
      name: string;
    }[];
    const present = new Set(names.map((row) => row.name));
    for (const name of FK_INDEXES) expect(present.has(name)).toBe(true);

    const plans = [
      ["quiz_options_question_id_idx", "delete from quiz_options where question_id = 'x'"],
      ["quiz_questions_quiz_id_idx", "delete from quiz_questions where quiz_id = 'x'"],
      ["quizzes_lesson_id_idx", "delete from quizzes where lesson_id = 'x'"],
      ["lessons_section_id_idx", "delete from lessons where section_id = 'x'"],
      ["sections_stage_id_idx", "delete from sections where stage_id = 'x'"],
      ["review_cards_question_id_idx", "delete from review_cards where question_id = 'x'"],
      ["review_logs_card_id_idx", "delete from review_logs where card_id = 'x'"],
      ["lesson_materials_lesson_id_idx", "delete from lesson_materials where lesson_id = 'x'"],
    ] as const;
    for (const [indexName, sql] of plans) {
      expect(planOf(db, sql)).toContain(indexName);
    }

    // 設問の delete は選択肢と復習カードへ cascade する。ここが全表スキャンだと seed の行読み取りが膨らむ。
    const questionPlan = planOf(db, "delete from quiz_questions where quiz_id = 'x'");
    expect(questionPlan).toContain("quiz_options_question_id_idx");
    expect(questionPlan).toContain("review_cards_question_id_idx");
    expect(questionPlan).not.toMatch(/SCAN quiz_options|SCAN review_cards/);

    const cardPlan = planOf(db, "delete from review_cards where question_id = 'x'");
    expect(cardPlan).toContain("review_logs_card_id_idx");
    expect(cardPlan).not.toMatch(/SCAN review_logs/);

    const attemptUpdate = planOf(db, "update quiz_attempts set quiz_id = 'y' where quiz_id = 'x'");
    expect(attemptUpdate).toContain("quiz_attempts_quiz_id_idx");
    expect(attemptUpdate).not.toMatch(/SCAN quiz_attempts/);
    const quizDelete = planOf(db, "delete from quizzes where lesson_id = 'x'");
    expect(quizDelete).toContain("quiz_attempts_quiz_id_idx");
    expect(quizDelete).not.toMatch(/SCAN quiz_attempts/);
  });
});

describe("教材 seed の再実行", () => {
  let seedSql = "";

  beforeAll(() => {
    seedSql = loadContentSeedSql();
  }, 120_000);

  // 全マイグレーションと全教材の seed を2回適用する結合テスト。
  // カバレッジ計測中の CI でも完走できるよう、このテストだけ上限を30秒にする。
  it("format 2 を seed し、公開API・7状態・知識問題とSRS・旧課題を通せる", async () => {
    const db = migratedDb();
    applyScript(db, seedSql);
    db.exec(
      "insert into profiles (id, tenant_id, role, display_name, created_at) values ('u-format2', 'ses', 'student', '見本受講者', 1), ('u-unenrolled', 'ses', 'student', '未受講', 1)",
    );
    const stage = db
      .prepare(
        "select id, format, environment, duration_hours from stages where slug = 'dev-env-basics'",
      )
      .get() as { id: string; format: number; environment: string; duration_hours: number };
    expect(stage).toMatchObject({ format: 2, duration_hours: 35, environment: "static-web-01" });
    db.prepare(
      "insert into enrollments (id, tenant_id, user_id, stage_id, status, required, enrolled_at) values ('en-format2', 'ses', 'u-format2', ?, 'active', 0, 1)",
    ).run(stage.id);
    const env = { DB: localD1(db), AUTH_JWT_SECRET: "test-format-2-secret" } as Env;
    const { app } = mountTestApp(env, tasksRoute, quizRoute, srsRoute);
    const token = await signAccessToken(env.AUTH_JWT_SECRET ?? "", "u-format2", "test@example.com");
    const otherToken = await signAccessToken(
      env.AUTH_JWT_SECRET ?? "",
      "u-unenrolled",
      "test@example.com",
    );
    const url = `/api/tasks/for-stage/${stage.id}`;
    expect((await request(app, env, url)).status).toBe(401);
    expect((await request(app, env, url, { token: otherToken })).status).toBe(404);
    const list = await json<{ tasks: TaskSummary[] }>(await request(app, env, url, { token }));
    expect(list.tasks).toHaveLength(1);
    expect(list.tasks[0].status).toBe("not-started");
    expect(JSON.stringify(list)).not.toMatch(/solution|rubric|bundle|private/);
    // 課題文のレッスンと結ばれ、そのレッスンからも「VS Code で開く」で課題を配れる (#31)。
    expect(
      db
        .prepare(
          "select l.type from lessons l join sections s on l.section_id = s.id where l.id = ? and s.stage_id = ?",
        )
        .get(list.tasks[0].lessonId, stage.id),
    ).toEqual({ type: "text" });
    const taskId = list.tasks[0].id;
    const bundleUrl = `/api/tasks/bundle?${new URLSearchParams({ taskId })}`;
    expect((await request(app, env, bundleUrl, { token: otherToken })).status).toBe(404);
    const { bundle } = await json<{ bundle: TaskBundle }>(
      await request(app, env, bundleUrl, { token }),
    );
    expect(Object.keys(bundle.files)).not.toContain("private/solution/index.html");
    expect(bundle.manifest).not.toHaveProperty("review");
    const post = (body: unknown) =>
      request(app, env, "/api/tasks/local-result", {
        token,
        method: "POST",
        body: JSON.stringify(body),
      });
    const resultBody = { taskId, contentHash: bundle.contentHash };
    for (const body of ["", "{", '{"taskId":']) {
      const invalid = await request(app, env, "/api/tasks/local-result", {
        token,
        method: "POST",
        body,
      });
      expect(invalid.status).toBe(400);
      expect(await json<{ error: string }>(invalid)).toEqual({ error: "invalid JSON" });
    }
    expect(countOf(db, "task_progress")).toBe(0);
    db.exec("update enrollments set status = 'completed' where id = 'en-format2'");
    expect((await request(app, env, url, { token })).status).toBe(200);
    expect((await request(app, env, bundleUrl, { token })).status).toBe(200);
    expect((await post(resultBody)).status).toBe(404);
    expect(countOf(db, "task_progress")).toBe(0);
    db.exec("update enrollments set status = 'expired' where id = 'en-format2'");
    expect((await request(app, env, url, { token })).status).toBe(404);
    expect((await request(app, env, bundleUrl, { token })).status).toBe(404);
    expect((await post(resultBody)).status).toBe(404);
    db.exec("update enrollments set status = 'active' where id = 'en-format2'");
    expect((await post({ taskId, contentHash: "old" })).status).toBe(409);
    expect((await post({ taskId, contentHash: bundle.contentHash, status: "passed" })).status).toBe(
      200,
    );
    const local = await json<{ tasks: TaskSummary[] }>(await request(app, env, url, { token }));
    expect(local.tasks[0].status).toBe("local-passed");
    expect((await taskCompletionCounts(getDb(env), stage.id, ["u-format2"])).passed.size).toBe(0);
    db.prepare("update task_progress set status = 'passed' where task_id = ?").run(taskId);
    db.exec("update enrollments set status = 'completed' where id = 'en-format2'");
    const completed = await json<{ tasks: TaskSummary[] }>(await request(app, env, url, { token }));
    expect(completed.tasks[0].status).toBe("passed");
    expect((await request(app, env, bundleUrl, { token })).status).toBe(200);
    expect((await post(resultBody)).status).toBe(404);
    db.exec("update enrollments set status = 'active' where id = 'en-format2'");
    await post({ taskId, contentHash: bundle.contentHash });
    expect(
      (await taskCompletionCounts(getDb(env), stage.id, ["u-format2"])).passed.get("u-format2")
        ?.size,
    ).toBe(1);
    const questionRows = db
      .prepare(
        'select q.id, q.kind, q.skills, z.lesson_id from quiz_questions q join quizzes z on q.quiz_id = z.id join lessons l on z.lesson_id = l.id join sections s on l.section_id = s.id where s.stage_id = ? order by q."order"',
      )
      .all(stage.id) as { id: string; kind: string; skills: string; lesson_id: string }[];
    expect(questionRows.map((q) => q.kind)).toEqual(["single", "multiple", "boolean"]);
    const quiz = db
      .prepare("select id from quizzes where lesson_id = ?")
      .get(questionRows[0].lesson_id) as { id: string };
    const answers = questionRows.map((q) => ({
      question_id: q.id,
      selected_option_ids: (
        db
          .prepare("select id from quiz_options where question_id = ? and is_correct = 1")
          .all(q.id) as { id: string }[]
      ).map((o) => o.id),
    }));
    const attempt = await request(app, env, `/api/quiz/${quiz.id}/attempt`, {
      token,
      method: "POST",
      body: JSON.stringify({ answers }),
    });
    expect(attempt.status).toBe(200);
    expect((await json<{ result: { passed: boolean } }>(attempt)).result.passed).toBe(true);
    expect(
      db.prepare("select count(*) as n from review_cards where user_id = 'u-format2'").get()?.n,
    ).toBe(3);
    db.prepare("update quizzes set source = 'practice' where id = ?").run(quiz.id);
    const excluded = await json<{ review: { questions: unknown[] } }>(
      await request(app, env, "/api/srs/today", { token }),
    );
    expect(excluded.review.questions).toHaveLength(0);
    db.exec("delete from review_cards where user_id = 'u-format2'");
    await request(app, env, `/api/quiz/${quiz.id}/attempt`, {
      token,
      method: "POST",
      body: JSON.stringify({ answers }),
    });
    expect(countOf(db, "review_cards")).toBe(0);
    db.prepare("update quizzes set source = 'knowledge' where id = ?").run(quiz.id);
    await request(app, env, `/api/quiz/${quiz.id}/attempt`, {
      token,
      method: "POST",
      body: JSON.stringify({ answers }),
    });
    db.exec("update review_cards set due_date = '2020-01-01' where user_id = 'u-format2'");
    const today = await json<{ review: { questions: { skills: string[] }[] } }>(
      await request(app, env, "/api/srs/today", { token }),
    );
    expect(today.review.questions).toHaveLength(3);
    expect(today.review.questions.every((q) => q.skills.length > 0)).toBe(true);
    const assignments = countOf(db, "assignments");
    expect(assignments).toBeGreaterThan(0);
    applyScript(db, seedSql);
    expect(countOf(db, "assignments")).toBe(assignments);
    expect(
      db.prepare("select status from task_progress where task_id = ?").get(taskId)?.status,
    ).toBe("passed");
    expect(countOf(db, "tasks")).toBe(1);
    expect(db.prepare("pragma foreign_key_check").all()).toEqual([]);
    db.close();
  }, 30_000);

  it("復習カードと解答ログを残し、設問数も変えない", () => {
    const db = migratedDb();
    applyScript(db, seedSql);

    const questions = db.prepare("select id, prompt from quiz_questions limit 3").all() as {
      id: string;
      prompt: string;
    }[];
    const question = questions[0];
    const shifted = questions[1];
    const rekeyed = questions[2];
    expect(question).toBeDefined();
    expect(shifted).toBeDefined();
    expect(rekeyed).toBeDefined();
    if (question === undefined || shifted === undefined || rekeyed === undefined) return;
    const questionsBefore = countOf(db, "quiz_questions");
    const optionsBefore = countOf(db, "quiz_options");
    expect(questionsBefore).toBeGreaterThan(2);

    db.prepare(
      "insert into profiles (id, tenant_id, role, display_name, created_at) values ('u-srs', 'ses', 'student', 'SRS', 1)",
    ).run();
    const insertCard = db.prepare(
      `insert into review_cards (id, tenant_id, user_id, question_id, ease, interval_days, reps, due_date, last_reviewed_at, created_at)
       values (?, 'ses', 'u-srs', ?, 2.5, 4, 3, '2026-10-01', 1, 1)`,
    );
    insertCard.run("card-1", question.id);
    insertCard.run("card-2", shifted.id);
    insertCard.run("card-3", rekeyed.id);
    const insertLog = db.prepare(
      `insert into review_logs (id, tenant_id, user_id, card_id, question_id, correct, answered_at)
       values (?, 'ses', 'u-srs', ?, ?, 1, 1)`,
    );
    insertLog.run("log-1", "card-1", question.id);
    insertLog.run("log-2", "card-2", shifted.id);
    insertLog.run("log-3", "card-3", rekeyed.id);
    db.prepare("update quiz_questions set prompt = ? where id = ?").run(
      `${shifted.prompt} (moved)`,
      shifted.id,
    );
    db.prepare(
      "update quiz_options set is_correct = case is_correct when 1 then 0 else 1 end where id = (select id from quiz_options where question_id = ? limit 1)",
    ).run(rekeyed.id);

    applyScript(db, seedSql);

    expect(countOf(db, "quiz_questions")).toBe(questionsBefore);
    expect(countOf(db, "quiz_options")).toBe(optionsBefore);
    expect(db.prepare("select reps, due_date from review_cards where id = 'card-1'").get()).toEqual(
      { reps: 3, due_date: "2026-10-01" },
    );
    expect(db.prepare("select id from review_logs where id = 'log-1'").get()).toEqual({
      id: "log-1",
    });
    expect(db.prepare("select id from quiz_questions where id = ?").get(question.id)).toEqual({
      id: question.id,
    });
    expect(db.prepare("select prompt from quiz_questions where id = ?").get(shifted.id)).toEqual({
      prompt: shifted.prompt,
    });
    expect(db.prepare("select id from review_cards where id = 'card-2'").get()).toBeUndefined();
    expect(db.prepare("select id from review_logs where id = 'log-2'").get()).toBeUndefined();
    expect(db.prepare("select id from review_cards where id = 'card-3'").get()).toBeUndefined();
    expect(db.prepare("select id from review_logs where id = 'log-3'").get()).toBeUndefined();
  }, 180_000);
});
