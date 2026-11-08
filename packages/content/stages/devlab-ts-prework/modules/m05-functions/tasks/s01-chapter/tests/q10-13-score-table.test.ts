// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { scoreTable, type Student } from "../src/q10-13-score-table";
test("問13 scoreTable", () => {
  const list = [
    { name: "山田", grade: 1, score: 80 },
    { name: "佐藤", grade: 2, score: 95 },
  ];
  expect(scoreTable(list)).toEqual({ 山田: 80, 佐藤: 95 });
  expectTypeOf(scoreTable).parameters.toEqualTypeOf<[readonly Student[]]>();
  expectTypeOf(scoreTable).returns.toEqualTypeOf<{ [name: string]: number }>();
});
