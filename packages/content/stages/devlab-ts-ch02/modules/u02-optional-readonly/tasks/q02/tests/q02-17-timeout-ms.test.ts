// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { timeoutMs } from "../src/q02-17-timeout-ms";
test("問17 timeoutMs", () => {
  expect(timeoutMs({ timeoutSeconds: 5 })).toBe(5000);
  expect(timeoutMs({})).toBe(30000);
  expectTypeOf(timeoutMs).parameters.toEqualTypeOf<[{ timeoutSeconds?: number }]>();
  expectTypeOf(timeoutMs).returns.toEqualTypeOf<number>();
});
