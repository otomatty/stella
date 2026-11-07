// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { errorMessage } from "../src/q01-11-error-message";
afterEach(() => {
  vi.useRealTimers();
});

test("問11 errorMessage", async () => {
  await expect(errorMessage(Promise.resolve(1))).resolves.toBe("成功");
  await expect(errorMessage(Promise.reject(new Error("x")))).resolves.toBe("x");
  // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- Error でない理由で失敗させる
  await expect(errorMessage(Promise.reject("x"))).resolves.toBe("不明なエラー");
  expectTypeOf(errorMessage).parameters.toEqualTypeOf<[Promise<unknown>]>();
  expectTypeOf(errorMessage).returns.toEqualTypeOf<Promise<string>>();
});
