// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { entryText } from "../src/q06-17-entry-text";
test("問17 entryText", () => {
  expect(entryText(["りんご", 3])).toBe("りんご × 3");
  expectTypeOf(entryText).parameters.toEqualTypeOf<[[string, number]]>();
  expectTypeOf(entryText).returns.toEqualTypeOf<string>();
});
