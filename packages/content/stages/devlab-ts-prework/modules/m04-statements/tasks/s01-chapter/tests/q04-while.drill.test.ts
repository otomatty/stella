// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  countDigits,
  halveUntilOdd,
  powerOfTwoAtLeast,
  stepsToZero,
  maxCountWithin,
  reverseNumber,
  isPrime,
  nextPrime,
  lcm,
  sumSkipThrees,
  firstIndexOver,
  leadingZeros,
  trimZeros,
  digitalRoot,
  bitLength,
  repeatToLength,
  divisibleTimes,
  sumPositives,
  firstRepeatedChar,
  digitsOf,
} from "../src/q04-while.drill";

test("問1 countDigits", () => {
  expect(countDigits(12345)).toBe(5);
  expect(countDigits(9)).toBe(1);
  expect(countDigits(10)).toBe(2);
  expectTypeOf(countDigits).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(countDigits).returns.toEqualTypeOf<number>();
});

test("問2 halveUntilOdd", () => {
  expect(halveUntilOdd(40)).toBe(5);
  expect(halveUntilOdd(7)).toBe(7);
  expect(halveUntilOdd(0)).toBe(0);
  expectTypeOf(halveUntilOdd).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(halveUntilOdd).returns.toEqualTypeOf<number>();
});

test("問3 powerOfTwoAtLeast", () => {
  expect(powerOfTwoAtLeast(5)).toBe(8);
  expect(powerOfTwoAtLeast(8)).toBe(8);
  expect(powerOfTwoAtLeast(1)).toBe(1);
  expectTypeOf(powerOfTwoAtLeast).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(powerOfTwoAtLeast).returns.toEqualTypeOf<number>();
});

test("問4 stepsToZero", () => {
  expect(stepsToZero(14)).toBe(6);
  expect(stepsToZero(1)).toBe(1);
  expect(stepsToZero(0)).toBe(0);
  expectTypeOf(stepsToZero).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(stepsToZero).returns.toEqualTypeOf<number>();
});

test("問5 maxCountWithin", () => {
  expect(maxCountWithin(10)).toBe(4);
  expect(maxCountWithin(9)).toBe(3);
  expect(maxCountWithin(0)).toBe(0);
  expectTypeOf(maxCountWithin).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(maxCountWithin).returns.toEqualTypeOf<number>();
});

test("問6 reverseNumber", () => {
  expect(reverseNumber(123)).toBe(321);
  expect(reverseNumber(1230)).toBe(321);
  expect(reverseNumber(0)).toBe(0);
  expectTypeOf(reverseNumber).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(reverseNumber).returns.toEqualTypeOf<number>();
});

test("問7 isPrime", () => {
  expect(isPrime(2)).toBe(true);
  expect(isPrime(13)).toBe(true);
  expect(isPrime(15)).toBe(false);
  expect(isPrime(1)).toBe(false);
  expectTypeOf(isPrime).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(isPrime).returns.toEqualTypeOf<boolean>();
});

test("問8 nextPrime", () => {
  expect(nextPrime(13)).toBe(17);
  expect(nextPrime(1)).toBe(2);
  expect(nextPrime(2)).toBe(3);
  expectTypeOf(nextPrime).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(nextPrime).returns.toEqualTypeOf<number>();
});

test("問9 lcm", () => {
  expect(lcm(4, 6)).toBe(12);
  expect(lcm(3, 5)).toBe(15);
  expect(lcm(6, 3)).toBe(6);
  expectTypeOf(lcm).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(lcm).returns.toEqualTypeOf<number>();
});

test("問10 sumSkipThrees", () => {
  expect(sumSkipThrees(6)).toBe(12);
  expect(sumSkipThrees(2)).toBe(3);
  expect(sumSkipThrees(0)).toBe(0);
  expectTypeOf(sumSkipThrees).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(sumSkipThrees).returns.toEqualTypeOf<number>();
});

test("問11 firstIndexOver", () => {
  expect(firstIndexOver([1, 5, 10], 4)).toBe(1);
  expect(firstIndexOver([1, 2], 4)).toBe(-1);
  expectTypeOf(firstIndexOver).parameters.toEqualTypeOf<[readonly number[], number]>();
  expectTypeOf(firstIndexOver).returns.toEqualTypeOf<number>();
});

test("問12 leadingZeros", () => {
  expect(leadingZeros("000120")).toBe(3);
  expect(leadingZeros("120")).toBe(0);
  expect(leadingZeros("000")).toBe(3);
  expectTypeOf(leadingZeros).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(leadingZeros).returns.toEqualTypeOf<number>();
});

test("問13 trimZeros", () => {
  expect(trimZeros("00120")).toBe("120");
  expect(trimZeros("000")).toBe("0");
  expect(trimZeros("5")).toBe("5");
  expectTypeOf(trimZeros).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(trimZeros).returns.toEqualTypeOf<string>();
});

test("問14 digitalRoot", () => {
  expect(digitalRoot(9875)).toBe(2);
  expect(digitalRoot(7)).toBe(7);
  expect(digitalRoot(10)).toBe(1);
  expectTypeOf(digitalRoot).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(digitalRoot).returns.toEqualTypeOf<number>();
});

test("問15 bitLength", () => {
  expect(bitLength(10)).toBe(4);
  expect(bitLength(1)).toBe(1);
  expect(bitLength(0)).toBe(1);
  expectTypeOf(bitLength).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(bitLength).returns.toEqualTypeOf<number>();
});

test("問16 repeatToLength", () => {
  expect(repeatToLength("ab", 5)).toBe("ababa");
  expect(repeatToLength("abc", 3)).toBe("abc");
  expect(repeatToLength("", 3)).toBe("");
  expectTypeOf(repeatToLength).parameters.toEqualTypeOf<[string, number]>();
  expectTypeOf(repeatToLength).returns.toEqualTypeOf<string>();
});

test("問17 divisibleTimes", () => {
  expect(divisibleTimes(48, 2)).toBe(4);
  expect(divisibleTimes(81, 3)).toBe(4);
  expect(divisibleTimes(7, 2)).toBe(0);
  expectTypeOf(divisibleTimes).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(divisibleTimes).returns.toEqualTypeOf<number>();
});

test("問18 sumPositives", () => {
  expect(sumPositives([3, -1, 0, 5])).toBe(8);
  expect(sumPositives([])).toBe(0);
  expectTypeOf(sumPositives).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(sumPositives).returns.toEqualTypeOf<number>();
});

test("問19 firstRepeatedChar", () => {
  expect(firstRepeatedChar("abcbd")).toBe("b");
  expect(firstRepeatedChar("abc")).toBeUndefined();
  expectTypeOf(firstRepeatedChar).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(firstRepeatedChar).returns.toEqualTypeOf<string | undefined>();
});

test("問20 digitsOf", () => {
  expect(digitsOf(305)).toEqual([3, 0, 5]);
  expect(digitsOf(0)).toEqual([0]);
  expectTypeOf(digitsOf).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(digitsOf).returns.toEqualTypeOf<number[]>();
});
