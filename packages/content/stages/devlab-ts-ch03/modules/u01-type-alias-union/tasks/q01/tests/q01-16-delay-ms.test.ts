// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { delayMs, type Delay } from "../src/q01-16-delay-ms";
test("問16 delayMs", () => {
  expectTypeOf<Delay>().toEqualTypeOf<number | "now">();
  expect(delayMs(1.5)).toBe(1500);
  expect(delayMs("now")).toBe(0);
  expectTypeOf(delayMs).parameters.toEqualTypeOf<[Delay]>();
  expectTypeOf(delayMs).returns.toEqualTypeOf<number>();
});
