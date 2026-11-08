// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isWithinLimit, type Limit } from "../src/q01-14-is-within-limit";
test("問14 isWithinLimit", () => {
  expectTypeOf<Limit>().toEqualTypeOf<number | "無制限">();
  expect(isWithinLimit(5, 3)).toBe(false);
  expect(isWithinLimit(3, 3)).toBe(true);
  expect(isWithinLimit(999, "無制限")).toBe(true);
  expectTypeOf(isWithinLimit).parameters.toEqualTypeOf<[number, Limit]>();
  expectTypeOf(isWithinLimit).returns.toEqualTypeOf<boolean>();
});
