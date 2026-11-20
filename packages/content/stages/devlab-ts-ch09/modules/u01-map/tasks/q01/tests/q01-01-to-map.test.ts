// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { toMap } from "../src/q01-01-to-map";
test("問1 toMap", () => {
  const map = toMap([
    ["山田", 80],
    ["佐藤", 65],
  ]);
  expect(map.get("佐藤")).toBe(65);
  expect(map.size).toBe(2);
  expectTypeOf(toMap).parameters.toEqualTypeOf<[[string, number][]]>();
  expectTypeOf(toMap).returns.toEqualTypeOf<Map<string, number>>();
});
