// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { pushUnique } from "../src/q02-09-push-unique";
test("問9 pushUnique", () => {
  const items = ["a"];
  expect(pushUnique(items, "b")).toBe(true);
  expect(pushUnique(items, "a")).toBe(false);
  expect(items).toEqual(["a", "b"]);
  expectTypeOf(pushUnique).parameters.toEqualTypeOf<[string[], string]>();
  expectTypeOf(pushUnique).returns.toEqualTypeOf<boolean>();
});
