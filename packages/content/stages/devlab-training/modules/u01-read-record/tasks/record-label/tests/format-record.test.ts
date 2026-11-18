import { describe, expect, it } from "vitest";
import { formatRecord } from "../src/format-record.ts";
import type { WorkRecord } from "../src/records.ts";

const record: WorkRecord = {
  id: "r1",
  week: "2026-W10",
  title: "設計レビュー",
  minutes: 30,
  status: "confirmed",
};

describe("作業記録の表示", () => {
  it("作業名と分数を表示する", () => {
    expect(formatRecord(record)).toBe("設計レビュー・30分");
  });

  it("0分を未入力と区別する", () => {
    expect(formatRecord({ ...record, title: "準備", minutes: 0 })).toBe(
      "準備・0分",
    );
  });

  it("時間が null なら未入力と表示する", () => {
    expect(formatRecord({ ...record, minutes: null })).toBe(
      "設計レビュー・未入力",
    );
  });
});
