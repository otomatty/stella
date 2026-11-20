// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { namesInOrder } from "../src/q02-09-names-in-order";
afterEach(() => {
  vi.useRealTimers();
});

test("問9 namesInOrder", async () => {
  await expect(namesInOrder([3, 1])).resolves.toEqual(["鈴木", "山田"]);
  await expect(namesInOrder([1, 9])).rejects.toThrow("ユーザー 9 はいません");
  expectTypeOf(namesInOrder).returns.toEqualTypeOf<Promise<string[]>>();
});
