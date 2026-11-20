// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { firstLetter } from "../src/q03-05-first-letter";
test("問5 firstLetter", () => {
  expect(firstLetter("abc")).toBe("a");
  expect(firstLetter("")).toBeUndefined();
  expect(firstLetter(undefined)).toBeUndefined();
  expectTypeOf(firstLetter).parameters.toEqualTypeOf<[string | undefined]>();
  expectTypeOf(firstLetter).returns.toEqualTypeOf<string | undefined>();
});
