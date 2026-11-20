// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { withScore } from "../src/q01-04-with-score";
test("問4 withScore", () => {
  const scores = new Map([["山田", 80]]);
  const result = withScore(scores, "鈴木", 90);
  expect([...result.entries()]).toEqual([
    ["山田", 80],
    ["鈴木", 90],
  ]);
  expect(withScore(scores, "山田", 10).get("山田")).toBe(10);
  expect(scores.size).toBe(1);
  expect(scores.get("山田")).toBe(80);
  expectTypeOf(withScore).parameters.toEqualTypeOf<[Map<string, number>, string, number]>();
  expectTypeOf(withScore).returns.toEqualTypeOf<Map<string, number>>();
});
