// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { levelValue, type LogLevel } from "../src/q07-09-level-value";
test("問9 levelValue", () => {
  expect(levelValue("debug")).toBe(0);
  expect(levelValue("info")).toBe(1);
  expect(levelValue("warn")).toBe(2);
  expect(levelValue("error")).toBe(3);
  expectTypeOf(levelValue).parameters.toEqualTypeOf<[LogLevel]>();
  expectTypeOf(levelValue).returns.toEqualTypeOf<number>();
});
