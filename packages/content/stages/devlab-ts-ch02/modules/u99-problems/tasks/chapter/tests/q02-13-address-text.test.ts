// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { addressText } from "../src/q02-13-address-text";
test("問13 addressText", () => {
  expect(addressText({ city: "渋谷区", building: "渋谷ビル" })).toBe("渋谷区 渋谷ビル");
  expect(addressText({ city: "新宿区" })).toBe("新宿区");
  expectTypeOf(addressText).parameters.toEqualTypeOf<[{ city: string; building?: string }]>();
  expectTypeOf(addressText).returns.toEqualTypeOf<string>();
});
