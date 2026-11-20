// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { makeLapTimer } from "../src/q08-18-make-lap-timer";
test("問18 makeLapTimer", () => {
  const lap = makeLapTimer();
  expect(lap(1000)).toBe(1000);
  expect(lap(1500)).toBe(500);
  expect(lap(1600)).toBe(100);
  expectTypeOf(makeLapTimer).parameters.toEqualTypeOf<[]>();
  expectTypeOf(makeLapTimer).returns.toEqualTypeOf<(t: number) => number>();
});
