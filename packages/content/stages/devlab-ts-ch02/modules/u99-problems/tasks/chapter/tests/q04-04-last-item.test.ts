// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { lastItem } from "../src/q04-04-last-item";
test("問4 lastItem", () => {
  expect(lastItem(["a", "b", "c"])).toBe("c");
  expect(lastItem([])).toBeUndefined();
  expectTypeOf(lastItem).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(lastItem).returns.toEqualTypeOf<string | undefined>();
});
