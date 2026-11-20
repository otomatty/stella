// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { itemAt } from "../src/q05-04-item-at";
test("問4 itemAt", () => {
  expect(itemAt(["a", "b"], 1)).toBe("b");
  expect(() => itemAt(["a", "b"], 2)).toThrow("範囲外です: 2");
  expectTypeOf(itemAt).parameters.toEqualTypeOf<[readonly string[], number]>();
  expectTypeOf(itemAt).returns.toEqualTypeOf<string>();
});
