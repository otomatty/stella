// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { startTimer, type Timer } from "../src/q08-10-start-timer";
test("問10 startTimer", () => {
  expect(startTimer({ state: "idle" }, 1000)).toEqual({ state: "running", startedAt: 1000 });
  expect(startTimer({ state: "paused", elapsed: 300 }, 1000)).toEqual({
    state: "running",
    startedAt: 700,
  });
  expect(startTimer({ state: "running", startedAt: 5 }, 1000)).toEqual({
    state: "running",
    startedAt: 5,
  });
  expectTypeOf(startTimer).parameters.toEqualTypeOf<[Timer, number]>();
  expectTypeOf(startTimer).returns.toEqualTypeOf<Timer>();
});
