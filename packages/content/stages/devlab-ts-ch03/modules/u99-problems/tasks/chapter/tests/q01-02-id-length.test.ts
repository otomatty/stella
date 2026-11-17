// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { idLength } from "../src/q01-02-id-length";
test("問2 idLength", () => {
  expect(idLength(12345)).toBe(5);
  expect(idLength("ab")).toBe(2);
  expectTypeOf(idLength).parameters.toEqualTypeOf<[string | number]>();
  expectTypeOf(idLength).returns.toEqualTypeOf<number>();
});
