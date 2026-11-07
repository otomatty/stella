// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { onlyOnce } from "../src/q08-09-only-once";
test("問9 onlyOnce", () => {
  let calls = 0;
  const get = onlyOnce(() => {
    calls++;
    return 42;
  });
  expect(get()).toBe(42);
  expect(get()).toBe(42);
  expect(calls).toBe(1);
  expectTypeOf(onlyOnce).parameters.toEqualTypeOf<[() => number]>();
  expectTypeOf(onlyOnce).returns.toEqualTypeOf<() => number>();
});
