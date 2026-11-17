// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { joinItems } from "../src/q04-08-join-items";
test("問8 joinItems", () => {
  expect(joinItems(["a", "b"])).toBe("a, b");
  expect(joinItems(["a", "b"], "/")).toBe("a/b");
  expectTypeOf(joinItems).parameters.toEqualTypeOf<[readonly string[], string?]>();
  expectTypeOf(joinItems).returns.toEqualTypeOf<string>();
});
