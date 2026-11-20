// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { levelPrefix, type LogLevel } from "../src/q07-10-level-prefix";
test("問10 levelPrefix", () => {
  expect(levelPrefix("debug")).toBe("[DEBUG]");
  expect(levelPrefix("info")).toBe("[INFO]");
  expect(levelPrefix("error")).toBe("[ERROR]");
  expectTypeOf(levelPrefix).parameters.toEqualTypeOf<[LogLevel]>();
  expectTypeOf(levelPrefix).returns.toEqualTypeOf<string>();
});
