// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { pauseTimer, type Timer } from "../src/q08-11-pause-timer";
test("問11 pauseTimer", () => {
  expect(pauseTimer({ state: "running", startedAt: 1000 }, 1500)).toEqual({
    state: "paused",
    elapsed: 500,
  });
  expect(pauseTimer({ state: "idle" }, 1500)).toEqual({ state: "idle" });
  expectTypeOf(pauseTimer).parameters.toEqualTypeOf<[Timer, number]>();
  expectTypeOf(pauseTimer).returns.toEqualTypeOf<Timer>();
});
