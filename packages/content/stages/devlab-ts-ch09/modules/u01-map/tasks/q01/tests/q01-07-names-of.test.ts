// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { namesOf } from "../src/q01-07-names-of";
test("問7 namesOf", () => {
  const scores = new Map([
    ["山田", 80],
    ["佐藤", 65],
  ]);
  expect(namesOf(scores)).toEqual(["山田", "佐藤"]);
  expectTypeOf(namesOf).parameters.toEqualTypeOf<[Map<string, number>]>();
  expectTypeOf(namesOf).returns.toEqualTypeOf<string[]>();
});
