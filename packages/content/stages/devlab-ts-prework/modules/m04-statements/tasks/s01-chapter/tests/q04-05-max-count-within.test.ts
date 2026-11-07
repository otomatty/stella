// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { maxCountWithin } from "../src/q04-05-max-count-within";
test("問5 maxCountWithin", () => {
  expect(maxCountWithin(10)).toBe(4);
  expect(maxCountWithin(9)).toBe(3);
  expect(maxCountWithin(0)).toBe(0);
  expectTypeOf(maxCountWithin).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(maxCountWithin).returns.toEqualTypeOf<number>();
});
