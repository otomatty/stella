// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { cityOrUnknown } from "../src/q03-07-city-or-unknown";
test("問7 cityOrUnknown", () => {
  expect(cityOrUnknown({ address: { city: "渋谷区" } })).toBe("渋谷区");
  expect(cityOrUnknown({})).toBe("不明");
  expectTypeOf(cityOrUnknown).parameters.toEqualTypeOf<[{ address?: { city: string } }]>();
  expectTypeOf(cityOrUnknown).returns.toEqualTypeOf<string>();
});
