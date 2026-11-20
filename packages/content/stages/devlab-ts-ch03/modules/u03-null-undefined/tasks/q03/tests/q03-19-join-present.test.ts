// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { joinPresent } from "../src/q03-19-join-present";
test("問19 joinPresent", () => {
  expect(joinPresent("山田", "太郎")).toBe("山田 太郎");
  expect(joinPresent("山田", null)).toBe("山田");
  expect(joinPresent(null, "太郎")).toBe("太郎");
  expect(joinPresent(null, null)).toBe("");
  expectTypeOf(joinPresent).parameters.toEqualTypeOf<[string | null, string | null]>();
  expectTypeOf(joinPresent).returns.toEqualTypeOf<string>();
});
