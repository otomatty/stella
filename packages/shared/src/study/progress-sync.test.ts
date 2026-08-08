import { describe, expect, it } from "vitest";

import {
  normalizeProgressRows,
  type ProgressSyncInput,
} from "./progress-sync.js";

function input(over: Partial<ProgressSyncInput> = {}): ProgressSyncInput {
  return {
    lesson_id: "lesson-a",
    completed: false,
    last_page: null,
    viewed_pages: [],
    watched_sec: null,
    updated_at: "2026-08-07T01:00:00.000Z",
    ...over,
  };
}

describe("normalizeProgressRows", () => {
  it("空配列はそのまま空", () => {
    expect(normalizeProgressRows([])).toEqual([]);
  });

  it("lesson_id が無い行を捨てる", () => {
    const rows = normalizeProgressRows([
      input({ lesson_id: "" }),
      input({ lesson_id: undefined as unknown as string }),
      input({ lesson_id: "lesson-b" }),
    ]);
    expect(rows.map((r) => r.lessonId)).toEqual(["lesson-b"]);
  });

  it("updated_at が解釈できない行を捨てる (Invalid Date を DB に書かない)", () => {
    const rows = normalizeProgressRows([
      input({ lesson_id: "bad", updated_at: "not-a-date" }),
      input({ lesson_id: "good" }),
    ]);
    expect(rows.map((r) => r.lessonId)).toEqual(["good"]);
  });

  it("同一 lesson_id は updated_at が最新の 1 行に集約する", () => {
    const rows = normalizeProgressRows([
      input({ watched_sec: 100, updated_at: "2026-08-07T01:00:00.000Z" }),
      input({ watched_sec: 300, updated_at: "2026-08-07T03:00:00.000Z" }),
      input({ watched_sec: 200, updated_at: "2026-08-07T02:00:00.000Z" }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.watchedSec).toBe(300);
    expect(rows[0]!.updatedAtMs).toBe(Date.parse("2026-08-07T03:00:00.000Z"));
  });

  it("集約しても入力順 (初出位置) は保たれる", () => {
    const rows = normalizeProgressRows([
      input({ lesson_id: "a" }),
      input({ lesson_id: "b" }),
      input({ lesson_id: "a", updated_at: "2026-08-07T09:00:00.000Z" }),
    ]);
    expect(rows.map((r) => r.lessonId)).toEqual(["a", "b"]);
  });

  it("視聴秒数も完了フラグも無い行は学習ログの対象外", () => {
    const rows = normalizeProgressRows([input({ watched_sec: null, completed: false })]);
    expect(rows[0]!.countsTowardActivity).toBe(false);
  });

  it("視聴秒数 0 だけの行も対象外 (増分が必ず 0 のため)", () => {
    const rows = normalizeProgressRows([input({ watched_sec: 0, completed: false })]);
    expect(rows[0]!.countsTowardActivity).toBe(false);
  });

  it("視聴秒数が正なら対象", () => {
    const rows = normalizeProgressRows([input({ watched_sec: 30 })]);
    expect(rows[0]!.countsTowardActivity).toBe(true);
  });

  it("完了フラグが立っていれば視聴秒数が無くても対象 (スライド等)", () => {
    const rows = normalizeProgressRows([input({ completed: true, watched_sec: null })]);
    expect(rows[0]!.countsTowardActivity).toBe(true);
  });

  it("数値でない watched_sec は null に落とす", () => {
    const rows = normalizeProgressRows([
      input({ watched_sec: Number.NaN }),
      input({ lesson_id: "b", watched_sec: "60" as unknown as number }),
    ]);
    expect(rows[0]!.watchedSec).toBeNull();
    expect(rows[1]!.watchedSec).toBeNull();
  });

  it("viewed_pages が配列でなければ空配列にする", () => {
    const rows = normalizeProgressRows([
      input({ viewed_pages: null as unknown as number[] }),
    ]);
    expect(rows[0]!.viewedPages).toEqual([]);
  });

  it("加算先の日付を JST で決める", () => {
    // 2026-08-07T15:00Z = 2026-08-08 00:00 JST
    const rows = normalizeProgressRows([
      input({ lesson_id: "a", watched_sec: 60, updated_at: "2026-08-07T14:59:00.000Z" }),
      input({ lesson_id: "b", watched_sec: 60, updated_at: "2026-08-07T15:00:00.000Z" }),
    ]);
    expect(rows.map((r) => r.activityDate)).toEqual(["2026-08-07", "2026-08-08"]);
  });

  it("オフライン分がまとまって届いても行ごとに日付が分かれる", () => {
    const rows = normalizeProgressRows([
      input({ lesson_id: "a", watched_sec: 60, updated_at: "2026-08-05T02:00:00.000Z" }),
      input({ lesson_id: "b", watched_sec: 60, updated_at: "2026-08-06T02:00:00.000Z" }),
      input({ lesson_id: "c", watched_sec: 60, updated_at: "2026-08-07T02:00:00.000Z" }),
    ]);
    expect(rows.map((r) => r.activityDate)).toEqual([
      "2026-08-05",
      "2026-08-06",
      "2026-08-07",
    ]);
  });
});
