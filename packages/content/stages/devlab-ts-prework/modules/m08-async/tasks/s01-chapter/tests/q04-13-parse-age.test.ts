// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { parseAge } from "../src/q04-13-parse-age";
afterEach(() => {
  vi.useRealTimers();
});

test("問13 parseAge", async () => {
  await expect(parseAge(() => Promise.resolve("20"))).resolves.toBe(20);
  await expect(parseAge(() => Promise.resolve("-1"))).rejects.toThrow("年齢が正しくありません: -1");
  await expect(parseAge(() => Promise.resolve("abc"))).rejects.toThrow(
    "年齢が正しくありません: abc",
  );
  expectTypeOf(parseAge).parameters.toEqualTypeOf<[() => Promise<string>]>();
  expectTypeOf(parseAge).returns.toEqualTypeOf<Promise<number>>();
});
