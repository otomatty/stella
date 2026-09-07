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
  PROGRESS_WRITE_QUERY_HEADROOM,
  assertProgressSyncSize,
  planLessonProgressWrites,
} from "./lesson-progress-write.js";
import type { Db } from "../db/client.js";

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
      "ses",
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
    expect(planLessonProgressWrites(dummyDb(), "ses", "seed-learner", [])).toEqual([]);
  });

  it("1 行と 11 行は進捗 upsert が 1 文、12 行で 2 文に分かれる", () => {
    const upsertCount = (n: number) =>
      planLessonProgressWrites(
        dummyDb(),
        "ses",
        "seed-learner",
        Array.from({ length: n }, (_, i) => row(i, false)),
      ).filter((batch) =>
        batch.some((stmt) => stmt.toSQL().sql.includes('insert into "lesson_progress"')),
      ).length;
    expect(upsertCount(1)).toBe(1);
    expect(upsertCount(11)).toBe(1);
    expect(upsertCount(12)).toBe(2);
  });

  it("日別ログの加算文は同じチャンクの進捗 upsert より前", () => {
    const [batch] = planLessonProgressWrites(dummyDb(), "ses", "seed-learner", [
      row(1, true),
      row(2, true),
    ]);
    expect(batch).toBeDefined();
    const sqls = (batch ?? []).map((stmt) => stmt.toSQL().sql);
    const activityAt = sqls.findIndex((s) => s.includes('insert into "study_activity"'));
    const progressAt = sqls.findIndex((s) => s.includes('insert into "lesson_progress"'));
    expect(activityAt).toBeGreaterThanOrEqual(0);
    expect(progressAt).toBeGreaterThan(activityAt);
  });
});

describe("assertProgressSyncSize", () => {
  it("上限を超える入力は 400 で拒否する", () => {
    expect(() => assertProgressSyncSize(MAX_PROGRESS_SYNC_ROWS)).not.toThrow();
    expect(() => assertProgressSyncSize(MAX_PROGRESS_SYNC_ROWS + 1)).toThrow(
      new RegExp(`${MAX_PROGRESS_SYNC_ROWS} 件まで`),
    );
  });

  it("上限件数の最悪ケースでも D1 の 1 呼び出しクエリ上限を超えない", () => {
    const batches = planLessonProgressWrites(
      dummyDb(),
      "ses",
      "seed-learner",
      Array.from({ length: MAX_PROGRESS_SYNC_ROWS }, (_, i) => row(i, true)),
    );
    const statements = batches.flat().length;
    expect(statements).toBeLessThanOrEqual(
      D1_MAX_QUERIES_PER_INVOCATION - PROGRESS_WRITE_QUERY_HEADROOM,
    );
  });
});
