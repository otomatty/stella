// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { containsItem } from "../src/q04-09-contains-item";
test("問9 containsItem", () => {
  expect(containsItem(["a", "b"], "b")).toBe(true);
  expect(containsItem(["a", "b"], "c")).toBe(false);
  expectTypeOf(containsItem).parameters.toEqualTypeOf<[readonly string[], string]>();
  expectTypeOf(containsItem).returns.toEqualTypeOf<boolean>();
});
