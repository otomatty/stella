// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { scoreOf } from "../src/q01-02-score-of";
test("問2 scoreOf", () => {
  const scores = new Map([["山田", 80]]);
  expect(scoreOf(scores, "山田")).toBe(80);
  expect(scoreOf(scores, "鈴木")).toBe(0);
  expectTypeOf(scoreOf).parameters.toEqualTypeOf<[Map<string, number>, string]>();
  expectTypeOf(scoreOf).returns.toEqualTypeOf<number>();
});
