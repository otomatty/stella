// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isValidUrl } from "../src/q05-06-is-valid-url";
test("問6 isValidUrl", () => {
  expect(isValidUrl("https://example.com")).toBe(true);
  expect(isValidUrl("example.com")).toBe(false);
  expectTypeOf(isValidUrl).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(isValidUrl).returns.toEqualTypeOf<boolean>();
});
