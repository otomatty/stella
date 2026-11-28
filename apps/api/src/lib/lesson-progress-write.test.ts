/**
 * 進捗 upsert は D1 のバインド上限 (100) を超えると
 * `too many SQL variables` で 500 になる。 12 レッスン以上を一度に同期する
 * 実運用 (TypeScript 入門は 42 レッスン) で分割されることを固定する。
 */

import { describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/d1";
import type { NormalizedProgressRow } from "@stella/shared/study/progress-sync";

import { D1_MAX_BOUND_PARAMS } from "./enrollment-bulk.js";
import {
  D1_MAX_QUERIES_PER_INVOCATION,
  MAX_PROGRESS_SYNC_ROWS,
  assertProgressSyncSize,
  executeLessonProgressWrites,
  planLessonProgressWrites,
} from "./lesson-progress-write.js";
import { getDb, type Db } from "../db/client.js";
import type { Env } from "../env.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";

function dummyDb(): Db {
  const dummy = {
    prepare: () => ({ bind: () => ({}) }),
    batch: async () => [],
    exec: async () => ({}),
    dump: async () => "",
  };
  return drizzle(dummy as never);
}

function uuid(i: number): string {
  return `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
}

function row(i: number, completed: boolean): NormalizedProgressRow {
  return {
    lessonId: uuid(i),
    completed,
    lastPage: null,
    viewedPages: [],
    watchedSec: completed ? 10 : null,
    updatedAtMs: 1_700_000_000_000 + i,
    countsTowardActivity: completed,
    activityDate: "2026-08-26",
  };
}

describe("planLessonProgressWrites", () => {
  it("12 行以上でも各 SQL のバインド数が D1 上限以下", () => {
    const batches = planLessonProgressWrites(
      dummyDb(),
      "seed-learner",
      Array.from({ length: 20 }, (_, i) => row(i, true)),
    );

    const upserts = batches
      .flat()
      .filter((stmt) => stmt.toSQL().sql.includes('insert into "lesson_progress"'));
    expect(upserts.length).toBeGreaterThan(1);
    for (const stmt of batches.flat()) {
      expect(stmt.toSQL().params.length).toBeLessThanOrEqual(D1_MAX_BOUND_PARAMS);
    }
  });

  it("空配列は SQL を組まず空の batch を返す", () => {
    expect(planLessonProgressWrites(dummyDb(), "seed-learner", [])).toEqual([]);
  });

  it("1 行と 11 行は進捗 upsert が 1 文、12 行で 2 文に分かれる", () => {
    const upsertCount = (n: number) =>
      planLessonProgressWrites(
        dummyDb(),
        "seed-learner",
        Array.from({ length: n }, (_, i) => row(i, false)),
      ).filter((batch) =>
        batch.some((stmt) => stmt.toSQL().sql.includes('insert into "lesson_progress"')),
      ).length;
    expect(upsertCount(1)).toBe(1);
    expect(upsertCount(11)).toBe(1);
    expect(upsertCount(12)).toBe(2);
  });

  it("枠に余裕があれば全行の日別と時間帯別の加算が進捗 upsert に先行する", () => {
    const [batch] = planLessonProgressWrites(dummyDb(), "seed-learner", [
      row(1, true),
      row(2, true),
    ]);
    expect(batch).toBeDefined();
    const tables = batch?.map((stmt) => stmt.toSQL().sql.match(/^insert into "(\w+)"/)?.[1]);
    expect(tables).toEqual([
      "study_activity",
      "study_activity_hours",
      "study_activity",
      "study_activity_hours",
      "lesson_progress",
    ]);
  });

  it("累計の差分を JST の時間帯に記録し、古い進捗と再送を加算しない", async () => {
    const { sqlite, binding } = sqliteD1();
    try {
      sqlite.exec(`
        insert into tenants (id, name, created_at, updated_at) values ('ses', 'SES', 1, 1);
        insert into profiles (id, tenant_id, role, display_name, created_at)
          values ('learner', 'ses', 'student', '受講者', 1);
        insert into stages (id, tenant_id, slug, title, created_at, updated_at)
          values ('stage', 'ses', 'test-stage', 'ステージ', 1, 1);
        insert into sections (id, stage_id, title, created_at) values ('unit', 'stage', '単元', 1);
        insert into lessons (id, section_id, title, type, created_at, updated_at)
          values ('lesson', 'unit', 'レッスン', 'slides', 1, 1);
      `);
      const db = getDb({ DB: binding } as Env);
      const first = {
        ...row(1, true),
        lessonId: "lesson",
        completed: false,
        updatedAtMs: Date.parse("2026-11-27T14:59:59.999Z"),
        activityDate: "2026-11-27",
      };
      const next = {
        ...first,
        watchedSec: 100,
        updatedAtMs: Date.parse("2026-11-27T15:00:00Z"),
        activityDate: "2026-11-28",
      };
      const completed = { ...next, updatedAtMs: next.updatedAtMs + 1000, completed: true };
      for (const progress of [
        first,
        next,
        completed,
        completed,
        { ...first, watchedSec: 999 },
        { ...completed, updatedAtMs: completed.updatedAtMs + 3_600_000 },
      ]) {
        await executeLessonProgressWrites(db, "learner", [progress]);
      }
      expect(
        sqlite
          .prepare(
            "select date, hour, watched_sec, completed_lessons from study_activity_hours order by date, hour",
          )
          .all(),
      ).toEqual([
        { date: "2026-11-27", hour: 23, watched_sec: 10, completed_lessons: 0 },
        { date: "2026-11-28", hour: 0, watched_sec: 90, completed_lessons: 1 },
      ]);
    } finally {
      sqlite.close();
    }
  });
});

describe("assertProgressSyncSize", () => {
  it("上限を超える入力は 400 で拒否する", () => {
    expect(MAX_PROGRESS_SYNC_ROWS).toBe(600);
    expect(() => assertProgressSyncSize(600)).not.toThrow();
    expect(() => assertProgressSyncSize(601)).toThrow(/600 件まで/);
  });

  it("600 行の進捗と日別加算を全件確保し、時間帯別は先頭の 43 行に限る", () => {
    const rows = Array.from({ length: 600 }, (_, i) => row(i, true));
    const batches = planLessonProgressWrites(dummyDb(), "seed-learner", rows);
    const statements = batches.flat().map((stmt) => stmt.toSQL());
    const daily = statements.filter((stmt) => stmt.sql.startsWith('insert into "study_activity"'));
    const hourly = statements.filter((stmt) =>
      stmt.sql.startsWith('insert into "study_activity_hours"'),
    );
    expect(daily).toHaveLength(600);
    expect(batches).toHaveLength(55);
    expect(hourly).toHaveLength(43);
    for (const [index, statement] of hourly.entries()) {
      expect(statement.params).toContain(uuid(index));
    }
    // ステージ解決 7 文、修了の自動判定 275 文、その他 20 文。
    expect(statements.length + 7 + 275 + 20).toBeLessThanOrEqual(D1_MAX_QUERIES_PER_INVOCATION);
  });
});
