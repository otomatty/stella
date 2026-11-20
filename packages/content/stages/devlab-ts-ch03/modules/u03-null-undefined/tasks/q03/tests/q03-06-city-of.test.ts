// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { cityOf } from "../src/q03-06-city-of";
test("問6 cityOf", () => {
  expect(cityOf({ address: { city: "渋谷区" } })).toBe("渋谷区");
  expect(cityOf({})).toBeUndefined();
  expectTypeOf(cityOf).parameters.toEqualTypeOf<[{ address?: { city: string } }]>();
  expectTypeOf(cityOf).returns.toEqualTypeOf<string | undefined>();
});
