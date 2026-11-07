// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { makeLimiter } from "../src/q08-10-make-limiter";
test("問10 makeLimiter", () => {
  const allow = makeLimiter(2);
  expect(allow()).toBe(true);
  expect(allow()).toBe(true);
  expect(allow()).toBe(false);
  expectTypeOf(makeLimiter).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(makeLimiter).returns.toEqualTypeOf<() => boolean>();
});
