// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { rankLabels, type Student } from "../src/q10-07-rank-labels";
test("問7 rankLabels", () => {
  const list = [
    { name: "山田", grade: 1, score: 80 },
    { name: "佐藤", grade: 2, score: 95 },
  ];
  expect(rankLabels(list)).toEqual(["1位 佐藤", "2位 山田"]);
  expectTypeOf(rankLabels).parameters.toEqualTypeOf<[readonly Student[]]>();
  expectTypeOf(rankLabels).returns.toEqualTypeOf<string[]>();
});
