// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isGuest } from "../src/q02-18-is-guest";
test("問18 isGuest", () => {
  expect(isGuest({ name: "山田" })).toBe(true);
  expect(isGuest({ name: "佐藤", memberId: 0 })).toBe(false);
  expectTypeOf(isGuest).parameters.toEqualTypeOf<[{ name: string; memberId?: number }]>();
  expectTypeOf(isGuest).returns.toEqualTypeOf<boolean>();
});
