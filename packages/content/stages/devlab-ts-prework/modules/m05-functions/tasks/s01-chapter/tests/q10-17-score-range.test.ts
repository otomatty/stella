// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { scoreRange, type Student } from "../src/q10-17-score-range";
test("問17 scoreRange", () => {
  const list = [
    { name: "山田", grade: 1, score: 80 },
    { name: "佐藤", grade: 2, score: 95 },
    { name: "鈴木", grade: 1, score: 60 },
  ];
  expect(scoreRange(list)).toEqual([60, 95]);
  expect(() => scoreRange([])).toThrow(Error);
  expectTypeOf(scoreRange).parameters.toEqualTypeOf<[readonly Student[]]>();
  expectTypeOf(scoreRange).returns.toEqualTypeOf<[number, number]>();
});
