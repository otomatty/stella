// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { rejectWith } from "../src/q01-02-reject-with";
afterEach(() => {
  vi.useRealTimers();
});

test("問2 rejectWith", async () => {
  await expect(rejectWith("失敗")).rejects.toThrow("失敗");
  expectTypeOf(rejectWith).returns.toEqualTypeOf<Promise<never>>();
});
