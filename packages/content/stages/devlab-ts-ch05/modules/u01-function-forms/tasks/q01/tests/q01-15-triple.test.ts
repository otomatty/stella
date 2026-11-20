// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { triple } from "../src/q01-15-triple";
test("問15 triple", () => {
  expect(triple(4)).toBe(12);
  expectTypeOf(triple).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(triple).returns.toEqualTypeOf<number>();
});
