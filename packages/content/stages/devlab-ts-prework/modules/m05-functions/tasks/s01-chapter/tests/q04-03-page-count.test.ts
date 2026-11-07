// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { pageCount } from "../src/q04-03-page-count";
test("問3 pageCount", () => {
  expect(pageCount(25)).toBe(3);
  expect(pageCount(25, 5)).toBe(5);
  expect(pageCount(0)).toBe(0);
  expectTypeOf(pageCount).parameters.toEqualTypeOf<[number, number?]>();
  expectTypeOf(pageCount).returns.toEqualTypeOf<number>();
});
