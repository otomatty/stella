// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { nameOrGuest } from "../src/q03-04-name-or-guest";
test("問4 nameOrGuest", () => {
  expect(nameOrGuest("山田")).toBe("山田");
  expect(nameOrGuest(null)).toBe("ゲスト");
  expectTypeOf(nameOrGuest).parameters.toEqualTypeOf<[string | null]>();
  expectTypeOf(nameOrGuest).returns.toEqualTypeOf<string>();
});
