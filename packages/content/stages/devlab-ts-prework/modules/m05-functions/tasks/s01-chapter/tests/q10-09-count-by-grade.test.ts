// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { countByGrade, type Student } from "../src/q10-09-count-by-grade";
test("問9 countByGrade", () => {
  const list = [
    { name: "山田", grade: 1, score: 80 },
    { name: "佐藤", grade: 2, score: 95 },
    { name: "鈴木", grade: 1, score: 60 },
  ];
  expect(countByGrade(list)).toEqual({ "1": 2, "2": 1 });
  expectTypeOf(countByGrade).parameters.toEqualTypeOf<[readonly Student[]]>();
  expectTypeOf(countByGrade).returns.toEqualTypeOf<{ [grade: string]: number }>();
});
