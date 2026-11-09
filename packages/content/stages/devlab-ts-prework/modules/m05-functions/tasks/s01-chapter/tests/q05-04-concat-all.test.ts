// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { concatAll } from "../src/q05-04-concat-all";
test("問4 concatAll", () => {
  expect(concatAll("a", "b", "c")).toBe("abc");
  expect(concatAll()).toBe("");
  expectTypeOf(concatAll).parameters.toEqualTypeOf<string[]>();
  expectTypeOf(concatAll).returns.toEqualTypeOf<string>();
});
