// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { stars } from "../src/q04-05-stars";
test("問5 stars", () => {
  expect(stars()).toBe("***");
  expect(stars("#", 5)).toBe("#####");
  expectTypeOf(stars).parameters.toEqualTypeOf<[string?, number?]>();
  expectTypeOf(stars).returns.toEqualTypeOf<string>();
});
