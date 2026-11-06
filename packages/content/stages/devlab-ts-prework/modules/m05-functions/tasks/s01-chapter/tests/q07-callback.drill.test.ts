// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  mapNumbers,
  filterNumbers,
  eachWithIndex,
  countWhere,
  someMatch,
  everyMatch,
  findNumber,
  findIndexWhere,
  times,
  reduceNumbers,
  mapStrings,
  applyTwice,
  sumBy,
  maxBy,
  sortByKey,
  rejectNumbers,
  splitBy,
  withLog,
  retry,
  composeTwo,
} from "../src/q07-callback.drill";

test("問1 mapNumbers", () => {
  expect(mapNumbers([1, 2], (n) => n * 10)).toEqual([10, 20]);
  expectTypeOf(mapNumbers).parameters.toEqualTypeOf<[readonly number[], (n: number) => number]>();
  expectTypeOf(mapNumbers).returns.toEqualTypeOf<number[]>();
});

test("問2 filterNumbers", () => {
  expect(filterNumbers([1, 2, 3, 4], (n) => n % 2 === 0)).toEqual([2, 4]);
  expectTypeOf(filterNumbers).parameters.toEqualTypeOf<
    [readonly number[], (n: number) => boolean]
  >();
  expectTypeOf(filterNumbers).returns.toEqualTypeOf<number[]>();
});

test("問3 eachWithIndex", () => {
  const calls: string[] = [];
  eachWithIndex(["a", "b"], (item, index) => {
    calls.push(`${index}:${item}`);
  });
  expect(calls).toEqual(["0:a", "1:b"]);
  expectTypeOf(eachWithIndex).parameters.toEqualTypeOf<
    [readonly string[], (item: string, index: number) => void]
  >();
  expectTypeOf(eachWithIndex).returns.toBeVoid();
});

test("問4 countWhere", () => {
  expect(countWhere(["a", "bb", "ccc"], (s) => s.length > 1)).toBe(2);
  expectTypeOf(countWhere).parameters.toEqualTypeOf<[readonly string[], (s: string) => boolean]>();
  expectTypeOf(countWhere).returns.toEqualTypeOf<number>();
});

test("問5 someMatch", () => {
  expect(someMatch([1, 3], (n) => n > 2)).toBe(true);
  expect(someMatch([1, 2], (n) => n > 2)).toBe(false);
  expectTypeOf(someMatch).parameters.toEqualTypeOf<[readonly number[], (n: number) => boolean]>();
  expectTypeOf(someMatch).returns.toEqualTypeOf<boolean>();
});

test("問6 everyMatch", () => {
  expect(everyMatch([2, 4], (n) => n % 2 === 0)).toBe(true);
  expect(everyMatch([2, 3], (n) => n % 2 === 0)).toBe(false);
  expect(everyMatch([], () => false)).toBe(true);
  expectTypeOf(everyMatch).parameters.toEqualTypeOf<[readonly number[], (n: number) => boolean]>();
  expectTypeOf(everyMatch).returns.toEqualTypeOf<boolean>();
});

test("問7 findNumber", () => {
  expect(findNumber([1, 5, 8], (n) => n > 4)).toBe(5);
  expect(findNumber([1], (n) => n > 4)).toBeUndefined();
  expectTypeOf(findNumber).parameters.toEqualTypeOf<[readonly number[], (n: number) => boolean]>();
  expectTypeOf(findNumber).returns.toEqualTypeOf<number | undefined>();
});

test("問8 findIndexWhere", () => {
  expect(findIndexWhere(["a", "bb"], (s) => s.length === 2)).toBe(1);
  expect(findIndexWhere(["a"], (s) => s.length === 2)).toBe(-1);
  expectTypeOf(findIndexWhere).parameters.toEqualTypeOf<
    [readonly string[], (s: string) => boolean]
  >();
  expectTypeOf(findIndexWhere).returns.toEqualTypeOf<number>();
});

test("問9 times", () => {
  const calls: number[] = [];
  times(3, (i) => {
    calls.push(i);
  });
  expect(calls).toEqual([0, 1, 2]);
  expectTypeOf(times).parameters.toEqualTypeOf<[number, (i: number) => void]>();
  expectTypeOf(times).returns.toBeVoid();
});

test("問10 reduceNumbers", () => {
  expect(reduceNumbers([1, 2, 3], (acc, n) => acc + n, 0)).toBe(6);
  expect(reduceNumbers([2, 3], (acc, n) => acc * n, 1)).toBe(6);
  expectTypeOf(reduceNumbers).parameters.toEqualTypeOf<
    [readonly number[], (acc: number, n: number) => number, number]
  >();
  expectTypeOf(reduceNumbers).returns.toEqualTypeOf<number>();
});

test("問11 mapStrings", () => {
  expect(mapStrings(["a", "b"], (s) => s.toUpperCase())).toEqual(["A", "B"]);
  expectTypeOf(mapStrings).parameters.toEqualTypeOf<[readonly string[], (s: string) => string]>();
  expectTypeOf(mapStrings).returns.toEqualTypeOf<string[]>();
});

test("問12 applyTwice", () => {
  expect(applyTwice((n) => n + 3, 1)).toBe(7);
  expect(applyTwice((n) => n * n, 3)).toBe(81);
  expectTypeOf(applyTwice).parameters.toEqualTypeOf<[(n: number) => number, number]>();
  expectTypeOf(applyTwice).returns.toEqualTypeOf<number>();
});

test("問13 sumBy", () => {
  expect(sumBy(["a", "bcd"], (w) => w.length)).toBe(4);
  expectTypeOf(sumBy).parameters.toEqualTypeOf<[readonly string[], (w: string) => number]>();
  expectTypeOf(sumBy).returns.toEqualTypeOf<number>();
});

test("問14 maxBy", () => {
  expect(maxBy(["a", "bcd", "ef"], (w) => w.length)).toBe("bcd");
  expect(maxBy([], (w) => w.length)).toBeUndefined();
  expectTypeOf(maxBy).parameters.toEqualTypeOf<[readonly string[], (w: string) => number]>();
  expectTypeOf(maxBy).returns.toEqualTypeOf<string | undefined>();
});

test("問15 sortByKey", () => {
  expect(sortByKey(["ccc", "a", "bb"], (w) => w.length)).toEqual(["a", "bb", "ccc"]);
  expectTypeOf(sortByKey).parameters.toEqualTypeOf<[readonly string[], (w: string) => number]>();
  expectTypeOf(sortByKey).returns.toEqualTypeOf<string[]>();
});

test("問16 rejectNumbers", () => {
  expect(rejectNumbers([1, 2, 3], (n) => n === 2)).toEqual([1, 3]);
  expectTypeOf(rejectNumbers).parameters.toEqualTypeOf<
    [readonly number[], (n: number) => boolean]
  >();
  expectTypeOf(rejectNumbers).returns.toEqualTypeOf<number[]>();
});

test("問17 splitBy", () => {
  expect(splitBy([1, 2, 3], (n) => n > 1)).toEqual([[2, 3], [1]]);
  expectTypeOf(splitBy).parameters.toEqualTypeOf<[readonly number[], (n: number) => boolean]>();
  expectTypeOf(splitBy).returns.toEqualTypeOf<[number[], number[]]>();
});

test("問18 withLog", () => {
  const log: string[] = [];
  expect(withLog(log, (n) => n * 2, 5)).toBe(10);
  expect(log).toEqual(["call(5)"]);
  expectTypeOf(withLog).parameters.toEqualTypeOf<[string[], (n: number) => number, number]>();
  expectTypeOf(withLog).returns.toEqualTypeOf<number>();
});

test("問19 retry", () => {
  const attempts: number[] = [];
  expect(
    retry(3, (attempt) => {
      attempts.push(attempt);
      return attempt === 2;
    }),
  ).toBe(true);
  expect(attempts).toEqual([1, 2]);
  expect(retry(3, () => false)).toBe(false);
  expectTypeOf(retry).parameters.toEqualTypeOf<[number, (attempt: number) => boolean]>();
  expectTypeOf(retry).returns.toEqualTypeOf<boolean>();
});

test("問20 composeTwo", () => {
  expect(
    composeTwo(
      (n) => n + 1,
      (n) => n * 10,
      2,
    ),
  ).toBe(30);
  expectTypeOf(composeTwo).parameters.toEqualTypeOf<
    [(n: number) => number, (n: number) => number, number]
  >();
  expectTypeOf(composeTwo).returns.toEqualTypeOf<number>();
});
