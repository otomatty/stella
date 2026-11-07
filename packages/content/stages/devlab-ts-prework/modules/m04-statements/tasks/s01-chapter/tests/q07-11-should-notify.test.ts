// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { shouldNotify, type LogLevel } from "../src/q07-11-should-notify";
test("問11 shouldNotify", () => {
  expect(shouldNotify("debug")).toBe(false);
  expect(shouldNotify("info")).toBe(false);
  expect(shouldNotify("warn")).toBe(true);
  expect(shouldNotify("error")).toBe(true);
  expectTypeOf(shouldNotify).parameters.toEqualTypeOf<[LogLevel]>();
  expectTypeOf(shouldNotify).returns.toEqualTypeOf<boolean>();
});
