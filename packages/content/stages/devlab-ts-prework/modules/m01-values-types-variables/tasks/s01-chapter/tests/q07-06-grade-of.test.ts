// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { gradeOf } from "../src/q07-06-grade-of";
test("問6 gradeOf", () => {
  expect(gradeOf(80)).toBe("A");
  expect(gradeOf(75)).toBe("B");
  expect(gradeOf(10)).toBe("C");
  expectTypeOf(gradeOf).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(gradeOf).returns.toEqualTypeOf<"A" | "B" | "C">();
});
