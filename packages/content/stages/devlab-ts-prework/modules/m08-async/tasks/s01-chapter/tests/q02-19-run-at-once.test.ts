// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { runAtOnce } from "../src/q02-19-run-at-once";
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
afterEach(() => {
  vi.useRealTimers();
});

test("問19 runAtOnce", async () => {
  const { log, tasks } = createTasks(["a", "b"]);
  await expect(runAtOnce(tasks)).resolves.toEqual(["a", "b"]);
  expect(log.slice(0, 2)).toEqual(["開始 a", "開始 b"]);
  expectTypeOf(runAtOnce).returns.toEqualTypeOf<Promise<string[]>>();
});
