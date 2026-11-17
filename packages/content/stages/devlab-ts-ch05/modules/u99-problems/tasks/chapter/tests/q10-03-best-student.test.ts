// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { bestStudent, type Student } from "../src/q10-03-best-student";
test("問3 bestStudent", () => {
  const a = { name: "山田", grade: 1, score: 80 };
  const b = { name: "佐藤", grade: 2, score: 95 };
  expect(bestStudent([a, b])).toBe(b);
  expect(bestStudent([])).toBeUndefined();
  expectTypeOf(bestStudent).parameters.toEqualTypeOf<[readonly Student[]]>();
  expectTypeOf(bestStudent).returns.toEqualTypeOf<Student | undefined>();
});
