// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { nameOf } from "../src/q06-03-name-of";
test("問3 nameOf", () => {
  expect(nameOf(["りんご", 3])).toBe("りんご");
  expectTypeOf(nameOf).parameters.toEqualTypeOf<[[string, number]]>();
  expectTypeOf(nameOf).returns.toEqualTypeOf<string>();
});
