// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { withAdded } from "../src/q02-06-with-added";
test("問6 withAdded", () => {
  const set = new Set(["a"]);
  expect([...withAdded(set, "b")]).toEqual(["a", "b"]);
  expect([...withAdded(set, "a")]).toEqual(["a"]);
  expect(set.size).toBe(1);
  expectTypeOf(withAdded).parameters.toEqualTypeOf<[Set<string>, string]>();
  expectTypeOf(withAdded).returns.toEqualTypeOf<Set<string>>();
});
