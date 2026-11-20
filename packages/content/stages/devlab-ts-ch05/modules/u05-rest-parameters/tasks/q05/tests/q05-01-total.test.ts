// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { total } from "../src/q05-01-total";
test("問1 total", () => {
  expect(total(1, 2, 3)).toBe(6);
  expect(total()).toBe(0);
  expectTypeOf(total).parameters.toEqualTypeOf<number[]>();
  expectTypeOf(total).returns.toEqualTypeOf<number>();
});
