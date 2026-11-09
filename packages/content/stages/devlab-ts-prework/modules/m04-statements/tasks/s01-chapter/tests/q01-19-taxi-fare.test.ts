// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { taxiFare } from "../src/q01-19-taxi-fare";
test("問19 taxiFare", () => {
  expect(taxiFare(1000, 23)).toBe(1200);
  expect(taxiFare(1000, 4)).toBe(1200);
  expect(taxiFare(1000, 5)).toBe(1000);
  expect(taxiFare(1000, 21)).toBe(1000);
  expectTypeOf(taxiFare).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(taxiFare).returns.toEqualTypeOf<number>();
});
