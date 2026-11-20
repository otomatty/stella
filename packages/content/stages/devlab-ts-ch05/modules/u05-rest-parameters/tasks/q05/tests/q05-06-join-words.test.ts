// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { joinWords } from "../src/q05-06-join-words";
test("問6 joinWords", () => {
  expect(joinWords("-", "a", "b", "c")).toBe("a-b-c");
  expect(joinWords("-")).toBe("");
  expectTypeOf(joinWords).parameters.toEqualTypeOf<[string, ...string[]]>();
  expectTypeOf(joinWords).returns.toEqualTypeOf<string>();
});
