// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { halveUntilOdd } from "../src/q04-02-halve-until-odd";
test("問2 halveUntilOdd", () => {
  expect(halveUntilOdd(40)).toBe(5);
  expect(halveUntilOdd(7)).toBe(7);
  expect(halveUntilOdd(0)).toBe(0);
  expectTypeOf(halveUntilOdd).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(halveUntilOdd).returns.toEqualTypeOf<number>();
});
