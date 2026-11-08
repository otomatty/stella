// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { withRemoved } from "../src/q02-07-with-removed";
test("問7 withRemoved", () => {
  const set = new Set(["a", "b"]);
  expect([...withRemoved(set, "a")]).toEqual(["b"]);
  expect(set.size).toBe(2);
  expectTypeOf(withRemoved).parameters.toEqualTypeOf<[Set<string>, string]>();
  expectTypeOf(withRemoved).returns.toEqualTypeOf<Set<string>>();
});
