// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { percentText } from "../src/q01-12-percent-text";
test("問12 percentText", () => {
  expect(percentText(0.5)).toBe("50%");
  expect(percentText(0.123)).toBe("12%");
  expectTypeOf(percentText).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(percentText).returns.toEqualTypeOf<string>();
});
