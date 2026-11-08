// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { shorten } from "../src/q04-15-shorten";
test("問15 shorten", () => {
  expect(shorten("TypeScript")).toBe("TypeS…");
  expect(shorten("TypeScript", 20)).toBe("TypeScript");
  expectTypeOf(shorten).parameters.toEqualTypeOf<[string, number?]>();
  expectTypeOf(shorten).returns.toEqualTypeOf<string>();
});
