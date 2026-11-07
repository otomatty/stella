// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { clockText } from "../src/q05-17-clock-text";
test("問17 clockText", () => {
  expect(clockText(9, 5)).toBe("09:05");
  expect(clockText(23, 59)).toBe("23:59");
  expectTypeOf(clockText).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(clockText).returns.toEqualTypeOf<string>();
});
