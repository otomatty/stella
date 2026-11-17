// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { parseYesNo } from "../src/q08-03-parse-yes-no";
test("問3 parseYesNo", () => {
  expect(parseYesNo("YES")).toBe(true);
  expect(parseYesNo("0")).toBe(false);
  expect(() => parseYesNo("maybe")).toThrow("真偽値ではありません: maybe");
  expectTypeOf(parseYesNo).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseYesNo).returns.toEqualTypeOf<boolean>();
});
