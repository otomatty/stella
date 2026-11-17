// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isPrime } from "../src/q04-07-is-prime";
test("問7 isPrime", () => {
  expect(isPrime(2)).toBe(true);
  expect(isPrime(13)).toBe(true);
  expect(isPrime(15)).toBe(false);
  expect(isPrime(1)).toBe(false);
  expectTypeOf(isPrime).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(isPrime).returns.toEqualTypeOf<boolean>();
});
