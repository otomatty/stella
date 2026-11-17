// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { summaryText, type Student } from "../src/q10-20-summary-text";
test("問20 summaryText", () => {
  const list = [
    { name: "山田", grade: 1, score: 80 },
    { name: "佐藤", grade: 2, score: 95 },
    { name: "鈴木", grade: 1, score: 60 },
  ];
  expect(summaryText(list)).toBe("人数 3、平均 78.3、最高 佐藤（95）");
  expect(summaryText([])).toBe("人数 0");
  expectTypeOf(summaryText).parameters.toEqualTypeOf<[readonly Student[]]>();
  expectTypeOf(summaryText).returns.toEqualTypeOf<string>();
});
