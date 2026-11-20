// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { tidy } from "../src/q08-07-tidy";
test("問7 tidy", () => {
  expect(tidy("  hi  ")).toBe("hi");
  expectTypeOf(tidy).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(tidy).returns.toEqualTypeOf<string>();
});
