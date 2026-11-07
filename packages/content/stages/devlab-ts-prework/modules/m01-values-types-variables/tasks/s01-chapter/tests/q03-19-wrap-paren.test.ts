// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { wrapParen } from "../src/q03-19-wrap-paren";
test("問19 wrapParen", () => {
  expect(wrapParen("注")).toBe("(注)");
  expect(wrapParen("")).toBe("()");
  expectTypeOf(wrapParen).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(wrapParen).returns.toEqualTypeOf<string>();
});
