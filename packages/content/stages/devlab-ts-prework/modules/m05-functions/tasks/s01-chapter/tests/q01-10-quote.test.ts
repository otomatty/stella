// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { quote } from "../src/q01-10-quote";
test("問10 quote", () => {
  expect(quote("abc")).toBe('"abc"');
  expectTypeOf(quote).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(quote).returns.toEqualTypeOf<string>();
});
