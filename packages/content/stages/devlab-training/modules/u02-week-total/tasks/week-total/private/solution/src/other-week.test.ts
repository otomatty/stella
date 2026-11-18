import { expect, it } from "vitest";
import { records } from "./records.ts";
import { sumWeek } from "./sum-week.ts";

it("別の週が集計に入らない", () => {
  const week = "2026-W10";
  const sameWeek = records.filter((record) => record.week === week);
  const otherWeek = {
    id: "another",
    week: "2026-W20",
    title: "資料整理",
    minutes: 60,
    status: "confirmed" as const,
  };
  const originalTotal = sumWeek(sameWeek, week);
  expect(originalTotal).toBe(50);
  expect(sumWeek([...sameWeek, otherWeek], week)).toBe(originalTotal);
});
