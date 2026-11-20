// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { orElse, type Maybe } from "../src/q06-18-or-else";
test("問18 orElse", () => {
  const nums: number[] = [1];
  const maybe: Maybe<number> = null;
  expect(orElse(maybe, 5)).toBe(5);
  expect(orElse("a", "b")).toBe("a");
  expectTypeOf<Maybe<string>>().toEqualTypeOf<string | null>();
  expectTypeOf(orElse(maybe, nums.length)).toEqualTypeOf<number>();
});
