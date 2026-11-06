// このファイルは書き換えないでください
import { afterEach, vi, expect, expectTypeOf, test } from "vitest";
import {
  getAge,
  getName,
  isAdult,
  greetUser,
  nameLength,
  ageAfter,
  sumAges,
  sumAgesAtOnce,
  namesInOrder,
  namesAtOnce,
  oldestName,
  averageAge,
  safeName,
  userExists,
  countFound,
  firstAdult,
  waitAndReturn,
  runInOrder,
  runAtOnce,
  untilFailure,
} from "../src/q02-async-await.drill";

afterEach(() => {
  vi.useRealTimers();
});

// 始まりと終わりを log に残す task を作る。failAt 番目の task は失敗する
const createTasks = (values: string[], failAt = -1) => {
  const log: string[] = [];
  const tasks = values.map((value, i) => async () => {
    log.push(`開始 ${value}`);
    await Promise.resolve();
    log.push(`終了 ${value}`);
    if (i === failAt) {
      throw new Error(`${value} は失敗`);
    }
    return value;
  });
  return { log, tasks };
};

test("問1 getAge", async () => {
  await expect(getAge(1)).resolves.toBe(34);
  await expect(getAge(9)).rejects.toThrow("ユーザー 9 はいません");
  expectTypeOf(getAge).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(getAge).returns.toEqualTypeOf<Promise<number>>();
});

test("問2 getName", async () => {
  await expect(getName(2)).resolves.toBe("佐藤");
  expectTypeOf(getName).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(getName).returns.toEqualTypeOf<Promise<string>>();
});

test("問3 isAdult", async () => {
  await expect(isAdult(4)).resolves.toBe(true);
  await expect(isAdult(2)).resolves.toBe(false);
  expectTypeOf(isAdult).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(isAdult).returns.toEqualTypeOf<Promise<boolean>>();
});

test("問4 greetUser", async () => {
  await expect(greetUser(3)).resolves.toBe("こんにちは、鈴木さん");
  expectTypeOf(greetUser).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(greetUser).returns.toEqualTypeOf<Promise<string>>();
});

test("問5 nameLength", async () => {
  await expect(nameLength(1)).resolves.toBe(2);
  expectTypeOf(nameLength).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(nameLength).returns.toEqualTypeOf<Promise<number>>();
});

test("問6 ageAfter", async () => {
  await expect(ageAfter(2, 5)).resolves.toBe(24);
  expectTypeOf(ageAfter).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(ageAfter).returns.toEqualTypeOf<Promise<number>>();
});

test("問7 sumAges", async () => {
  await expect(sumAges(1, 2)).resolves.toBe(53);
  expectTypeOf(sumAges).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(sumAges).returns.toEqualTypeOf<Promise<number>>();
});

test("問8 sumAgesAtOnce", async () => {
  await expect(sumAgesAtOnce(3, 4)).resolves.toBe(72);
  expectTypeOf(sumAgesAtOnce).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(sumAgesAtOnce).returns.toEqualTypeOf<Promise<number>>();
});

test("問9 namesInOrder", async () => {
  await expect(namesInOrder([3, 1])).resolves.toEqual(["鈴木", "山田"]);
  await expect(namesInOrder([1, 9])).rejects.toThrow("ユーザー 9 はいません");
  expectTypeOf(namesInOrder).returns.toEqualTypeOf<Promise<string[]>>();
});

test("問10 namesAtOnce", async () => {
  await expect(namesAtOnce([2, 4])).resolves.toEqual(["佐藤", "田中"]);
  expectTypeOf(namesAtOnce).returns.toEqualTypeOf<Promise<string[]>>();
});

test("問11 oldestName", async () => {
  await expect(oldestName([1, 3, 4])).resolves.toBe("鈴木");
  await expect(oldestName([])).resolves.toBeUndefined();
  expectTypeOf(oldestName).returns.toEqualTypeOf<Promise<string | undefined>>();
});

test("問12 averageAge", async () => {
  await expect(averageAge([1, 2])).resolves.toBe(26.5);
  await expect(averageAge([])).resolves.toBe(0);
  expectTypeOf(averageAge).returns.toEqualTypeOf<Promise<number>>();
});

test("問13 safeName", async () => {
  await expect(safeName(1)).resolves.toBe("山田");
  await expect(safeName(9)).resolves.toBe("不明");
  expectTypeOf(safeName).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(safeName).returns.toEqualTypeOf<Promise<string>>();
});

test("問14 userExists", async () => {
  await expect(userExists(1)).resolves.toBe(true);
  await expect(userExists(9)).resolves.toBe(false);
  expectTypeOf(userExists).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(userExists).returns.toEqualTypeOf<Promise<boolean>>();
});

test("問15 countFound", async () => {
  await expect(countFound([1, 9, 3, 8])).resolves.toBe(2);
  await expect(countFound([])).resolves.toBe(0);
  expectTypeOf(countFound).returns.toEqualTypeOf<Promise<number>>();
});

test("問16 firstAdult", async () => {
  await expect(firstAdult([2, 9, 4, 1])).resolves.toBe("田中");
  await expect(firstAdult([2])).resolves.toBeUndefined();
  expectTypeOf(firstAdult).returns.toEqualTypeOf<Promise<string | undefined>>();
});

test("問17 waitAndReturn", async () => {
  vi.useFakeTimers();
  let result: string | undefined;
  void waitAndReturn(100, "a").then((value) => {
    result = value;
  });
  await vi.advanceTimersByTimeAsync(99);
  expect(result).toBeUndefined();
  await vi.advanceTimersByTimeAsync(1);
  expect(result).toBe("a");
  expectTypeOf(waitAndReturn).parameters.toEqualTypeOf<[number, string]>();
  expectTypeOf(waitAndReturn).returns.toEqualTypeOf<Promise<string>>();
});

test("問18 runInOrder", async () => {
  const { log, tasks } = createTasks(["a", "b"]);
  await expect(runInOrder(tasks)).resolves.toEqual(["a", "b"]);
  expect(log).toEqual(["開始 a", "終了 a", "開始 b", "終了 b"]);
  expectTypeOf(runInOrder).returns.toEqualTypeOf<Promise<string[]>>();
});

test("問19 runAtOnce", async () => {
  const { log, tasks } = createTasks(["a", "b"]);
  await expect(runAtOnce(tasks)).resolves.toEqual(["a", "b"]);
  expect(log.slice(0, 2)).toEqual(["開始 a", "開始 b"]);
  expectTypeOf(runAtOnce).returns.toEqualTypeOf<Promise<string[]>>();
});

test("問20 untilFailure", async () => {
  const { log, tasks } = createTasks(["a", "b", "c"], 1);
  await expect(untilFailure(tasks)).resolves.toEqual(["a"]);
  expect(log).not.toContain("開始 c");
  const all = createTasks(["x", "y"]);
  await expect(untilFailure(all.tasks)).resolves.toEqual(["x", "y"]);
  expectTypeOf(untilFailure).returns.toEqualTypeOf<Promise<string[]>>();
});
