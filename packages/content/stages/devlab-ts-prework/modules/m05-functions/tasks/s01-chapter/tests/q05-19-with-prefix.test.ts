// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { withPrefix } from "../src/q05-19-with-prefix";
test("問19 withPrefix", () => {
  expect(withPrefix("#", "a", "b")).toEqual(["#a", "#b"]);
  expect(withPrefix("#")).toEqual([]);
  expectTypeOf(withPrefix).parameters.toEqualTypeOf<[string, ...string[]]>();
  expectTypeOf(withPrefix).returns.toEqualTypeOf<string[]>();
});
