// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { repeat } from "../src/q08-13-repeat";
test("問13 repeat", () => {
  expect(repeat("ha", 3)).toBe("hahaha");
  expectTypeOf(repeat).parameters.toEqualTypeOf<[string, number]>();
  expectTypeOf(repeat).returns.toEqualTypeOf<string>();
});
