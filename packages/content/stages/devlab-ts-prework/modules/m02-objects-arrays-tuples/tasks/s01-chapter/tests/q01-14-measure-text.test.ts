// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { measureText } from "../src/q01-14-measure-text";
test("問14 measureText", () => {
  expect(measureText({ value: 25, unit: "℃" })).toBe("25℃");
  expect(measureText({ value: 1.5, unit: "kg" })).toBe("1.5kg");
  expectTypeOf(measureText).parameters.toEqualTypeOf<[{ value: number; unit: string }]>();
  expectTypeOf(measureText).returns.toEqualTypeOf<string>();
});
