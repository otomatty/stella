// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { getName } from "../src/q02-02-get-name";
afterEach(() => {
  vi.useRealTimers();
});

test("問2 getName", async () => {
  await expect(getName(2)).resolves.toBe("佐藤");
  expectTypeOf(getName).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(getName).returns.toEqualTypeOf<Promise<string>>();
});
