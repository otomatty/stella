// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { joinWithComma } from "../src/q04-11-join-with-comma";
test("問11 joinWithComma", () => {
  expect(joinWithComma(["a", "b", "c"])).toBe("a, b, c");
  expect(joinWithComma([])).toBe("");
  expectTypeOf(joinWithComma).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(joinWithComma).returns.toEqualTypeOf<string>();
});
