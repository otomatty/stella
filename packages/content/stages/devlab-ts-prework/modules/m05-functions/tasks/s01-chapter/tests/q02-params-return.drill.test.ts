// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  logTo,
  addAll,
  clearAll,
  rename,
  incrementAll,
  resetCounter,
  toggleFlag,
  swapInPlace,
  pushUnique,
  clampValue,
  parsePort,
  formatBytes,
  sumAndAverage,
  doNothing,
  greetAll,
  describeUser,
  pickNumbers,
  secondsText,
  firstOr,
  sumValues,
} from "../src/q02-params-return.drill";

test("問1 logTo", () => {
  const lines: string[] = [];
  logTo(lines, "start");
  logTo(lines, "end");
  expect(lines).toEqual(["start", "end"]);
  expectTypeOf(logTo).parameters.toEqualTypeOf<[string[], string]>();
  expectTypeOf(logTo).returns.toBeVoid();
});

test("問2 addAll", () => {
  const target = [0];
  addAll(target, [1, 2]);
  expect(target).toEqual([0, 1, 2]);
  expectTypeOf(addAll).parameters.toEqualTypeOf<[number[], readonly number[]]>();
  expectTypeOf(addAll).returns.toBeVoid();
});

test("問3 clearAll", () => {
  const items = ["a", "b"];
  clearAll(items);
  expect(items).toEqual([]);
  expectTypeOf(clearAll).parameters.toEqualTypeOf<[string[]]>();
  expectTypeOf(clearAll).returns.toBeVoid();
});

test("問4 rename", () => {
  const user = { name: "山田" };
  rename(user, "佐藤");
  expect(user.name).toBe("佐藤");
  expectTypeOf(rename).parameters.toEqualTypeOf<[{ name: string }, string]>();
  expectTypeOf(rename).returns.toBeVoid();
});

test("問5 incrementAll", () => {
  const counts = [1, 2];
  incrementAll(counts);
  expect(counts).toEqual([2, 3]);
  expectTypeOf(incrementAll).parameters.toEqualTypeOf<[number[]]>();
  expectTypeOf(incrementAll).returns.toBeVoid();
});

test("問6 resetCounter", () => {
  const counter = { count: 5 };
  resetCounter(counter);
  expect(counter.count).toBe(0);
  expectTypeOf(resetCounter).parameters.toEqualTypeOf<[{ count: number }]>();
  expectTypeOf(resetCounter).returns.toBeVoid();
});

test("問7 toggleFlag", () => {
  const flags: { [key: string]: boolean } = { dark: false };
  toggleFlag(flags, "dark");
  toggleFlag(flags, "beta");
  expect(flags).toEqual({ dark: true, beta: true });
  expectTypeOf(toggleFlag).parameters.toEqualTypeOf<[{ [key: string]: boolean }, string]>();
  expectTypeOf(toggleFlag).returns.toBeVoid();
});

test("問8 swapInPlace", () => {
  const items = ["a", "b", "c"];
  swapInPlace(items, 0, 2);
  expect(items).toEqual(["c", "b", "a"]);
  expect(() => {
    swapInPlace(items, 0, 5);
  }).toThrow(Error);
  expectTypeOf(swapInPlace).parameters.toEqualTypeOf<[string[], number, number]>();
  expectTypeOf(swapInPlace).returns.toBeVoid();
});

test("問9 pushUnique", () => {
  const items = ["a"];
  expect(pushUnique(items, "b")).toBe(true);
  expect(pushUnique(items, "a")).toBe(false);
  expect(items).toEqual(["a", "b"]);
  expectTypeOf(pushUnique).parameters.toEqualTypeOf<[string[], string]>();
  expectTypeOf(pushUnique).returns.toEqualTypeOf<boolean>();
});

test("問10 clampValue", () => {
  expect(clampValue(15, 0, 10)).toBe(10);
  expect(clampValue(-1, 0, 10)).toBe(0);
  expectTypeOf(clampValue).parameters.toEqualTypeOf<[number, number, number]>();
  expectTypeOf(clampValue).returns.toEqualTypeOf<number>();
});

test("問11 parsePort", () => {
  expect(parsePort("8080")).toBe(8080);
  expect(parsePort("0")).toBeUndefined();
  expect(parsePort("abc")).toBeUndefined();
  expectTypeOf(parsePort).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parsePort).returns.toEqualTypeOf<number | undefined>();
});

test("問12 formatBytes", () => {
  expect(formatBytes(512)).toBe("512 B");
  expect(formatBytes(1536)).toBe("1.5 KB");
  expect(formatBytes(2 * 1024 * 1024)).toBe("2.0 MB");
  expectTypeOf(formatBytes).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(formatBytes).returns.toEqualTypeOf<string>();
});

test("問13 sumAndAverage", () => {
  expect(sumAndAverage([1, 2, 3])).toEqual({ sum: 6, average: 2 });
  expect(sumAndAverage([])).toEqual({ sum: 0, average: 0 });
  expectTypeOf(sumAndAverage).parameters.toEqualTypeOf<[readonly number[]]>();
  expectTypeOf(sumAndAverage).returns.toEqualTypeOf<{ sum: number; average: number }>();
});

test("問14 doNothing", () => {
  expect(() => {
    doNothing();
  }).not.toThrow();
  expectTypeOf(doNothing).parameters.toEqualTypeOf<[]>();
  expectTypeOf(doNothing).returns.toBeVoid();
});

test("問15 greetAll", () => {
  expect(greetAll(["山田", "佐藤"])).toEqual(["山田さん、こんにちは", "佐藤さん、こんにちは"]);
  expectTypeOf(greetAll).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(greetAll).returns.toEqualTypeOf<string[]>();
});

test("問16 describeUser", () => {
  expect(describeUser({ name: "山田", age: 30 })).toBe("山田（30歳）");
  expectTypeOf(describeUser).parameters.toEqualTypeOf<[{ name: string; age: number }]>();
  expectTypeOf(describeUser).returns.toEqualTypeOf<string>();
});

test("問17 pickNumbers", () => {
  expect(pickNumbers([1, "a", 2])).toEqual([1, 2]);
  expectTypeOf(pickNumbers).parameters.toEqualTypeOf<[readonly (string | number)[]]>();
  expectTypeOf(pickNumbers).returns.toEqualTypeOf<number[]>();
});

test("問18 secondsText", () => {
  expect(secondsText(1500)).toBe("1.5秒");
  expect(secondsText(200)).toBe("0.2秒");
  expectTypeOf(secondsText).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(secondsText).returns.toEqualTypeOf<string>();
});

test("問19 firstOr", () => {
  expect(firstOr(["a"], "なし")).toBe("a");
  expect(firstOr([], "なし")).toBe("なし");
  expectTypeOf(firstOr).parameters.toEqualTypeOf<[readonly string[], string]>();
  expectTypeOf(firstOr).returns.toEqualTypeOf<string>();
});

test("問20 sumValues", () => {
  expect(sumValues({ a: 1, b: 2 })).toBe(3);
  expect(sumValues({})).toBe(0);
  expectTypeOf(sumValues).parameters.toEqualTypeOf<[{ [key: string]: number }]>();
  expectTypeOf(sumValues).returns.toEqualTypeOf<number>();
});
