// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { assertText } from "../src/q09-14-assert-text";
test("問14 assertText", () => {
  expect(() => {
    assertText(1);
  }).toThrow("文字列ではありません");
  expect(() => {
    assertText("a");
  }).not.toThrow();
  expectTypeOf(assertText).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(assertText).asserts.toEqualTypeOf<string>();
});
