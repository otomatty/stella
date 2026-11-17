// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { priceText } from "../src/q04-04-price-text";
test("問4 priceText", () => {
  expect(priceText(1200)).toBe("1,200円");
  expect(priceText(1200, "ドル")).toBe("1,200ドル");
  expectTypeOf(priceText).parameters.toEqualTypeOf<[number, string?]>();
  expectTypeOf(priceText).returns.toEqualTypeOf<string>();
});
