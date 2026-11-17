// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { toggle } from "../src/q02-08-toggle";
test("問8 toggle", () => {
  const set = new Set(["a"]);
  expect(toggle(set, "a").size).toBe(0);
  expect([...toggle(set, "b")]).toEqual(["a", "b"]);
  expect(set.size).toBe(1);
  expectTypeOf(toggle).parameters.toEqualTypeOf<[Set<string>, string]>();
  expectTypeOf(toggle).returns.toEqualTypeOf<Set<string>>();
});
