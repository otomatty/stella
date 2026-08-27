import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import { lessonIdRemapStatements } from "./lesson-id-remap.js";

function setupProgress() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    create table lesson_progress (
      id text primary key,
      user_id text not null,
      lesson_id text not null,
      completed integer not null default 0,
      last_page integer,
      viewed_pages text not null default '[]',
      watched_sec real,
      updated_at integer not null
    );
    create unique index lesson_progress_user_lesson_uq on lesson_progress (user_id, lesson_id);
    create table submissions (id text primary key, lesson_id text);
    create table lesson_materials (id text primary key, lesson_id text);
    create table quizzes (id text primary key, lesson_id text);
  `);
  return db;
}

function applyRemap(db: DatabaseSync, pairs: { from: string; to: string }[]) {
  for (const stmt of lessonIdRemapStatements(pairs, (name) => name)) {
    db.exec(stmt);
  }
}

function insert(
  db: DatabaseSync,
  row: {
    id: string;
    lessonId: string;
    completed: number;
    lastPage: number | null;
    viewedPages: string;
    watchedSec: number | null;
    updatedAt: number;
  },
) {
  db.prepare(
    `insert into lesson_progress
      (id, user_id, lesson_id, completed, last_page, viewed_pages, watched_sec, updated_at)
     values (?, 'u1', ?, ?, ?, ?, ?, ?)`,
  ).run(
    row.id,
    row.lessonId,
    row.completed,
    row.lastPage,
    row.viewedPages,
    row.watchedSec,
    row.updatedAt,
  );
}

describe("lessonIdRemapStatements", () => {
  const oldId = "old-quiz-0-2";
  const newId = "new-quiz-0-2";
  const pairs = [{ from: oldId, to: newId }];

  it("衝突時は UNIQUE せず、完了済みの新 ID 行を残す (旧が後から未完了で来ても)", () => {
    const db = setupProgress();
    insert(db, {
      id: "new-row",
      lessonId: newId,
      completed: 1,
      lastPage: 3,
      viewedPages: "[1,2,3]",
      watchedSec: 10,
      updatedAt: 100,
    });
    insert(db, {
      id: "old-row",
      lessonId: oldId,
      completed: 0,
      lastPage: 1,
      viewedPages: "[1]",
      watchedSec: 2,
      updatedAt: 200,
    });

    applyRemap(db, pairs);

    const rows = db
      .prepare(
        "select id, lesson_id, completed, last_page, viewed_pages, watched_sec, updated_at from lesson_progress",
      )
      .all() as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: "new-row",
      lesson_id: newId,
      completed: 1,
      last_page: 3,
      viewed_pages: "[1,2,3]",
      watched_sec: 10,
      updated_at: 200,
    });
  });

  it("旧だけある行は新 ID へ付け替える", () => {
    const db = setupProgress();
    insert(db, {
      id: "old-row",
      lessonId: oldId,
      completed: 1,
      lastPage: 2,
      viewedPages: "[1,2]",
      watchedSec: 8,
      updatedAt: 50,
    });

    applyRemap(db, pairs);

    const rows = db.prepare("select id, lesson_id, completed from lesson_progress").all() as Array<
      Record<string, unknown>
    >;
    expect(rows).toEqual([{ id: "old-row", lesson_id: newId, completed: 1 }]);
  });

  it("旧が完了・新が未完了なら完了を新 ID 行へ残す", () => {
    const db = setupProgress();
    insert(db, {
      id: "new-row",
      lessonId: newId,
      completed: 0,
      lastPage: null,
      viewedPages: "[]",
      watchedSec: null,
      updatedAt: 10,
    });
    insert(db, {
      id: "old-row",
      lessonId: oldId,
      completed: 1,
      lastPage: 4,
      viewedPages: "[4]",
      watchedSec: 40,
      updatedAt: 5,
    });

    applyRemap(db, pairs);

    const rows = db
      .prepare(
        "select lesson_id, completed, last_page, viewed_pages, watched_sec from lesson_progress",
      )
      .all() as Array<Record<string, unknown>>;
    expect(rows).toEqual([
      {
        lesson_id: newId,
        completed: 1,
        last_page: null,
        viewed_pages: "[]",
        watched_sec: 40,
      },
    ]);
  });

  it("対応表が大きくても各文は D1 の 100KB/query 制限に収まる", () => {
    const pairs = Array.from({ length: 200 }, (_, i) => ({
      from: `00000000-0000-5000-8000-${String(i).padStart(12, "0")}`,
      to: `10000000-0000-5000-8000-${String(i).padStart(12, "0")}`,
    }));
    for (const stmt of lessonIdRemapStatements(pairs, (name) => name)) {
      expect(Buffer.byteLength(stmt) + 1).toBeLessThanOrEqual(100_000);
    }
  });
});
