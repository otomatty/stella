// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { untilFailure } from "../src/q02-20-until-failure";
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

test("問20 untilFailure", async () => {
  const { log, tasks } = createTasks(["a", "b", "c"], 1);
  await expect(untilFailure(tasks)).resolves.toEqual(["a"]);
  expect(log).not.toContain("開始 c");
  const all = createTasks(["x", "y"]);
  await expect(untilFailure(all.tasks)).resolves.toEqual(["x", "y"]);
  expectTypeOf(untilFailure).returns.toEqualTypeOf<Promise<string[]>>();
});
