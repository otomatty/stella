// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { toObject } from "../src/q01-09-to-object";
test("問9 toObject", () => {
  const scores = new Map([
    ["山田", 80],
    ["佐藤", 65],
  ]);
  expect(toObject(scores)).toEqual({ 山田: 80, 佐藤: 65 });
  expectTypeOf(toObject).parameters.toEqualTypeOf<[Map<string, number>]>();
  expectTypeOf(toObject).returns.toEqualTypeOf<Record<string, number>>();
});
