// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { compareText } from "../src/q01-11-compare-text";
test("問11 compareText", () => {
  expect(compareText(3, 2)).toBe("a のほうが大きい");
  expect(compareText(1, 2)).toBe("b のほうが大きい");
  expect(compareText(2, 2)).toBe("同じ");
  expectTypeOf(compareText).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(compareText).returns.toEqualTypeOf<string>();
});
