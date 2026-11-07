// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { lookupOr } from "../src/q08-20-lookup-or";
test("問20 lookupOr", () => {
  expect(lookupOr({ ja: "こんにちは" }, "ja", "?")).toBe("こんにちは");
  expect(lookupOr({ ja: "こんにちは" }, "en", "?")).toBe("?");
  expectTypeOf(lookupOr).parameters.toEqualTypeOf<[{ [key: string]: string }, string, string]>();
  expectTypeOf(lookupOr).returns.toEqualTypeOf<string>();
});
