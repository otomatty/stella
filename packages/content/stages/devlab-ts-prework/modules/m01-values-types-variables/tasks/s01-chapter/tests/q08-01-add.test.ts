// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { add } from "../src/q08-01-add";
test("問1 add", () => {
  expect(add(2, 3)).toBe(5);
  expectTypeOf(add).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(add).returns.toEqualTypeOf<number>();
});
