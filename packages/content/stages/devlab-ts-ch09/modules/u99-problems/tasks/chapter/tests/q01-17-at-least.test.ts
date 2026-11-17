// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { atLeast } from "../src/q01-17-at-least";
test("問17 atLeast", () => {
  const scores = new Map([
    ["山田", 80],
    ["佐藤", 65],
    ["鈴木", 70],
  ]);
  expect([...atLeast(scores, 70).keys()]).toEqual(["山田", "鈴木"]);
  expect(scores.size).toBe(3);
  expectTypeOf(atLeast).parameters.toEqualTypeOf<[Map<string, number>, number]>();
  expectTypeOf(atLeast).returns.toEqualTypeOf<Map<string, number>>();
});
