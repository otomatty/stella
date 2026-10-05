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
  });
});

describe("教材 seed の再実行", () => {
  let seedSql = "";

  beforeAll(() => {
    seedSql = loadContentSeedSql();
  }, 120_000);

  it("復習カードと解答ログを残し、設問数も変えない", () => {
    const db = migratedDb();
    applyScript(db, seedSql);

    const question = db.prepare("select id from quiz_questions limit 1").get() as
      | { id: string }
      | undefined;
    expect(question).toBeDefined();
    if (question === undefined) return;
    const questionsBefore = countOf(db, "quiz_questions");
    const optionsBefore = countOf(db, "quiz_options");
    expect(questionsBefore).toBeGreaterThan(0);

    db.prepare(
      "insert into profiles (id, tenant_id, role, display_name, created_at) values ('u-srs', 'ses', 'student', 'SRS', 1)",
    ).run();
    db.prepare(
      `insert into review_cards (id, tenant_id, user_id, question_id, ease, interval_days, reps, due_date, last_reviewed_at, created_at)
       values ('card-1', 'ses', 'u-srs', ?, 2.5, 4, 3, '2026-10-01', 1, 1)`,
    ).run(question.id);
    db.prepare(
      `insert into review_logs (id, tenant_id, user_id, card_id, question_id, correct, answered_at)
       values ('log-1', 'ses', 'u-srs', 'card-1', ?, 1, 1)`,
    ).run(question.id);

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
  }, 180_000);
});
