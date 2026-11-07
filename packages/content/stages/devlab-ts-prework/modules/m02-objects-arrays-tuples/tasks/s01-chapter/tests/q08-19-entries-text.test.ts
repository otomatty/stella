// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { entriesText } from "../src/q08-19-entries-text";
test("問19 entriesText", () => {
  expect(entriesText({ a: 1, b: 2 })).toBe("a=1, b=2");
  expect(entriesText({})).toBe("");
  expectTypeOf(entriesText).parameters.toEqualTypeOf<[{ [key: string]: number }]>();
  expectTypeOf(entriesText).returns.toEqualTypeOf<string>();
});
