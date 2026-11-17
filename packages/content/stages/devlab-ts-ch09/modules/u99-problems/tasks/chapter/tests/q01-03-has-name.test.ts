// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { hasName } from "../src/q01-03-has-name";
test("問3 hasName", () => {
  const scores = new Map([["山田", 0]]);
  expect(hasName(scores, "山田")).toBe(true);
  expect(hasName(scores, "佐藤")).toBe(false);
  expectTypeOf(hasName).parameters.toEqualTypeOf<[Map<string, number>, string]>();
  expectTypeOf(hasName).returns.toEqualTypeOf<boolean>();
});
