// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { joinWithDash } from "../src/q03-09-join-with-dash";
test("問9 joinWithDash", () => {
  expect(joinWithDash(["a", "b", "c"])).toBe("a-b-c");
  expect(joinWithDash(["a"])).toBe("a");
  expect(joinWithDash([])).toBe("");
  expectTypeOf(joinWithDash).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(joinWithDash).returns.toEqualTypeOf<string>();
});
