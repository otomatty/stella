// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { withoutName } from "../src/q01-05-without-name";
test("問5 withoutName", () => {
  const scores = new Map([
    ["山田", 80],
    ["佐藤", 65],
  ]);
  expect([...withoutName(scores, "山田").keys()]).toEqual(["佐藤"]);
  expect(scores.size).toBe(2);
  expectTypeOf(withoutName).parameters.toEqualTypeOf<[Map<string, number>, string]>();
  expectTypeOf(withoutName).returns.toEqualTypeOf<Map<string, number>>();
});
