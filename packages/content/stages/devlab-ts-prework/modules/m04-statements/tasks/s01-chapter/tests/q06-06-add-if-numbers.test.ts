// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { addIfNumbers } from "../src/q06-06-add-if-numbers";
test("問6 addIfNumbers", () => {
  expect(addIfNumbers(1, 2)).toBe(3);
  expect(addIfNumbers(1, "2")).toBeNull();
  expectTypeOf(addIfNumbers).parameters.toEqualTypeOf<[unknown, unknown]>();
  expectTypeOf(addIfNumbers).returns.toEqualTypeOf<number | null>();
});
