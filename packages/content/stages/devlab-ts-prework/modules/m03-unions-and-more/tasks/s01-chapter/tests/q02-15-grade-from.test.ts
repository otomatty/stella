// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { gradeFrom, type Grade } from "../src/q02-15-grade-from";
test("問15 gradeFrom", () => {
  expectTypeOf<Grade>().toEqualTypeOf<"A" | "B" | "C" | "D">();
  expect(gradeFrom(90)).toBe("A");
  expect(gradeFrom(75)).toBe("B");
  expect(gradeFrom(50)).toBe("C");
  expect(gradeFrom(49)).toBe("D");
  expectTypeOf(gradeFrom).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(gradeFrom).returns.toEqualTypeOf<Grade>();
});
