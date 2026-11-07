// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { decodeOr } from "../src/q05-09-decode-or";
test("問9 decodeOr", () => {
  expect(decodeOr("%E3%81%82", "?")).toBe("あ");
  expect(decodeOr("%", "?")).toBe("?");
  expectTypeOf(decodeOr).parameters.toEqualTypeOf<[string, string]>();
  expectTypeOf(decodeOr).returns.toEqualTypeOf<string>();
});
