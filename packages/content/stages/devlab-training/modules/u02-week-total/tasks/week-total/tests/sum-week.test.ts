import { describe, expect, it } from "vitest";
import { sumWeek } from "../src/sum-week.ts";
import type { WorkRecord } from "../src/records.ts";
import "../src/other-week.test.ts";

const records: WorkRecord[] = [
  {
    id: "a",
    week: "2026-W10",
    title: "設計レビュー",
    minutes: 30,
    status: "confirmed",
  },
  {
    id: "b",
    week: "2026-W10",
    title: "動作確認",
    minutes: 20,
    status: "draft",
  },
  {
    id: "c",
    week: "2026-W10",
    title: "画面調整",
    minutes: null,
    status: "draft",
  },
];

describe("指定週の合計", () => {
  it("同じ週の確定30分と下書き20分を足す", () => {
    expect(sumWeek(records, "2026-W10")).toBe(50);
  });

  it("該当する記録がなければ0分を返す", () => {
    expect(sumWeek(records, "2026-W12")).toBe(0);
  });
});
