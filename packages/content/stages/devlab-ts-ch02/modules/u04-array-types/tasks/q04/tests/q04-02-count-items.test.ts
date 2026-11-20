// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { countItems } from "../src/q04-02-count-items";
test("問2 countItems", () => {
  expect(countItems(["a", "b"])).toBe(2);
  expect(countItems([])).toBe(0);
  expectTypeOf(countItems).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(countItems).returns.toEqualTypeOf<number>();
});
