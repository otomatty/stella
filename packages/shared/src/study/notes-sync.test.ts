import { describe, expect, it } from "vitest";

import {
  clampNoteBody,
  MAX_NOTE_LENGTH,
  normalizeNoteRows,
  type NoteSyncInput,
} from "./notes-sync.js";

function input(over: Partial<NoteSyncInput> = {}): NoteSyncInput {
  return {
    lesson_id: "lesson-a",
    body: "メモ",
    updated_at: "2026-08-07T01:00:00.000Z",
    ...over,
  };
}

describe("normalizeNoteRows", () => {
  it("空配列はそのまま空", () => {
    expect(normalizeNoteRows([])).toEqual([]);
  });

  it("lesson_id が無い行を捨てる", () => {
    const rows = normalizeNoteRows([
      input({ lesson_id: "" }),
      input({ lesson_id: undefined as unknown as string }),
      input({ lesson_id: "lesson-b" }),
    ]);
    expect(rows.map((r) => r.lessonId)).toEqual(["lesson-b"]);
  });

  it("body が文字列でない行を捨てる", () => {
    const rows = normalizeNoteRows([
      input({ lesson_id: "bad", body: null as unknown as string }),
      input({ lesson_id: "good" }),
    ]);
    expect(rows.map((r) => r.lessonId)).toEqual(["good"]);
  });

  it("空文字の body は残す (ノートのクリアを同期できるように)", () => {
    const rows = normalizeNoteRows([input({ body: "" })]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.body).toBe("");
  });

  it("updated_at が解釈できない行を捨てる (Invalid Date を DB に書かない)", () => {
    const rows = normalizeNoteRows([
      input({ lesson_id: "bad", updated_at: "not-a-date" }),
      input({ lesson_id: "good" }),
    ]);
    expect(rows.map((r) => r.lessonId)).toEqual(["good"]);
  });

  it("同一 lesson_id は updated_at が最新の 1 行に集約する", () => {
    const rows = normalizeNoteRows([
      input({ body: "1st", updated_at: "2026-08-07T01:00:00.000Z" }),
      input({ body: "3rd", updated_at: "2026-08-07T03:00:00.000Z" }),
      input({ body: "2nd", updated_at: "2026-08-07T02:00:00.000Z" }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.body).toBe("3rd");
    expect(rows[0]!.updatedAtMs).toBe(Date.parse("2026-08-07T03:00:00.000Z"));
  });

  it("サーバ時刻より未来の updated_at はサーバ時刻に丸める (時計スキュー対策)", () => {
    const now = Date.parse("2026-08-09T00:00:00.000Z");
    const rows = normalizeNoteRows(
      [input({ updated_at: "2026-08-09T01:00:00.000Z" })],
      now,
    );
    expect(rows[0]!.updatedAtMs).toBe(now);
  });

  it("過去の updated_at はそのまま (オフライン分の遅れた同期を壊さない)", () => {
    const now = Date.parse("2026-08-09T00:00:00.000Z");
    const past = "2026-08-08T00:00:00.000Z";
    const rows = normalizeNoteRows([input({ updated_at: past })], now);
    expect(rows[0]!.updatedAtMs).toBe(Date.parse(past));
  });

  it("丸めた後の時刻で最新行を選ぶ", () => {
    const now = Date.parse("2026-08-09T00:00:00.000Z");
    const rows = normalizeNoteRows(
      [
        input({ body: "未来の時計", updated_at: "2026-08-09T09:00:00.000Z" }),
        input({ body: "正しい時計", updated_at: "2026-08-08T23:59:59.000Z" }),
      ],
      now,
    );
    // 未来分は now に丸められ、 それでも now の方が新しいので先頭行が残る。
    expect(rows).toHaveLength(1);
    expect(rows[0]!.body).toBe("未来の時計");
    expect(rows[0]!.updatedAtMs).toBe(now);
  });

  it("入力順 (同一 lesson_id は初出位置) を保つ", () => {
    const rows = normalizeNoteRows([
      input({ lesson_id: "a" }),
      input({ lesson_id: "b" }),
      input({ lesson_id: "a", updated_at: "2026-08-07T05:00:00.000Z" }),
    ]);
    expect(rows.map((r) => r.lessonId)).toEqual(["a", "b"]);
  });

  it("長すぎる body は切り詰める", () => {
    const rows = normalizeNoteRows([input({ body: "あ".repeat(MAX_NOTE_LENGTH + 100) })]);
    expect(rows[0]!.body).toHaveLength(MAX_NOTE_LENGTH);
  });

  it("クライアントが clamp 済みなら normalize 後も一致する (競合の誤検知防止)", () => {
    const clamped = clampNoteBody("あ".repeat(MAX_NOTE_LENGTH + 100));
    const rows = normalizeNoteRows([input({ body: clamped })]);
    expect(rows[0]!.body).toBe(clamped);
  });
});

describe("clampNoteBody", () => {
  it("上限以下はそのまま返す", () => {
    expect(clampNoteBody("メモ")).toBe("メモ");
    expect(clampNoteBody("")).toBe("");
  });

  it("上限を超えた分を落とす", () => {
    expect(clampNoteBody("a".repeat(MAX_NOTE_LENGTH + 1))).toHaveLength(MAX_NOTE_LENGTH);
  });
});
