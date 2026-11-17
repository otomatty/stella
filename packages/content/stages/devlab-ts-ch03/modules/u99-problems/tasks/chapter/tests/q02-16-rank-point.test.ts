// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { rankPoint, type Rank } from "../src/q02-16-rank-point";
test("問16 rankPoint", () => {
  expectTypeOf<Rank>().toEqualTypeOf<"gold" | "silver" | "bronze">();
  expect(rankPoint("gold")).toBe(3);
  expect(rankPoint("silver")).toBe(2);
  expect(rankPoint("bronze")).toBe(1);
  expectTypeOf(rankPoint).parameters.toEqualTypeOf<[Rank]>();
  expectTypeOf(rankPoint).returns.toEqualTypeOf<number>();
});
