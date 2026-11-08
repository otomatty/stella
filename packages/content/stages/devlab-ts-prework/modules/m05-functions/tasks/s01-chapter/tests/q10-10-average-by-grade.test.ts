// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { averageByGrade, type Student } from "../src/q10-10-average-by-grade";
test("問10 averageByGrade", () => {
  const list = [
    { name: "山田", grade: 1, score: 80 },
    { name: "佐藤", grade: 2, score: 95 },
    { name: "鈴木", grade: 1, score: 61 },
  ];
  expect(averageByGrade(list)).toEqual({ "1": 70.5, "2": 95 });
  expectTypeOf(averageByGrade).parameters.toEqualTypeOf<[readonly Student[]]>();
  expectTypeOf(averageByGrade).returns.toEqualTypeOf<{ [grade: string]: number }>();
});
