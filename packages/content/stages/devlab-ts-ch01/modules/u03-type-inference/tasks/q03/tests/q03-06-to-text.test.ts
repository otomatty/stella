// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { toText } from "../src/q03-06-to-text";
test("問6 toText", () => {
  expect(toText(42)).toBe("42");
  expect(toText(-1.5)).toBe("-1.5");
  expectTypeOf(toText).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(toText).returns.toEqualTypeOf<string>();
});
