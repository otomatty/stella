// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { countInvalidJson } from "../src/q05-17-count-invalid-json";
test("問17 countInvalidJson", () => {
  expect(countInvalidJson(["1", "{", "[]", "x"])).toBe(2);
  expect(countInvalidJson([])).toBe(0);
  expectTypeOf(countInvalidJson).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(countInvalidJson).returns.toEqualTypeOf<number>();
});
