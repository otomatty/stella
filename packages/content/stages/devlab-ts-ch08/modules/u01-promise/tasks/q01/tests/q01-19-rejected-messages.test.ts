// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { rejectedMessages } from "../src/q01-19-rejected-messages";
afterEach(() => {
  vi.useRealTimers();
});

test("問19 rejectedMessages", async () => {
  await expect(
    rejectedMessages([
      Promise.resolve(1),
      Promise.reject(new Error("x")),
      Promise.reject(new Error("y")),
    ]),
  ).resolves.toEqual(["x", "y"]);
  // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- Error でない理由で失敗させる
  await expect(rejectedMessages([Promise.reject(404)])).resolves.toEqual(["不明なエラー"]);
  expectTypeOf(rejectedMessages).returns.toEqualTypeOf<Promise<string[]>>();
});
