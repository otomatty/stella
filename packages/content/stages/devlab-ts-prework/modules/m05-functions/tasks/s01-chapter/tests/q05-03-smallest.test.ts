// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { smallest } from "../src/q05-03-smallest";
test("問3 smallest", () => {
  expect(smallest(3, 9, 2)).toBe(2);
  expect(smallest(7)).toBe(7);
  expectTypeOf(smallest).parameters.toEqualTypeOf<[number, ...number[]]>();
  expectTypeOf(smallest).returns.toEqualTypeOf<number>();
});
