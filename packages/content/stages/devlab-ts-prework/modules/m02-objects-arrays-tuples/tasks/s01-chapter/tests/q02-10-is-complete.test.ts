// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isComplete } from "../src/q02-10-is-complete";
test("問10 isComplete", () => {
  expect(isComplete({ name: "山田", email: "a@example.com" })).toBe(true);
  expect(isComplete({ name: "山田" })).toBe(false);
  expect(isComplete({})).toBe(false);
  expectTypeOf(isComplete).parameters.toEqualTypeOf<[{ name?: string; email?: string }]>();
  expectTypeOf(isComplete).returns.toEqualTypeOf<boolean>();
});
