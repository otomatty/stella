// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { nextPrime } from "../src/q04-08-next-prime";
test("問8 nextPrime", () => {
  expect(nextPrime(13)).toBe(17);
  expect(nextPrime(1)).toBe(2);
  expect(nextPrime(2)).toBe(3);
  expectTypeOf(nextPrime).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(nextPrime).returns.toEqualTypeOf<number>();
});
