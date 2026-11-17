// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { resetTimer, type Timer } from "../src/q08-12-reset-timer";
test("問12 resetTimer", () => {
  expect(resetTimer({ state: "paused", elapsed: 300 })).toEqual({ state: "idle" });
  expect(resetTimer({ state: "running", startedAt: 5 })).toEqual({ state: "idle" });
  expectTypeOf(resetTimer).parameters.toEqualTypeOf<[Timer]>();
  expectTypeOf(resetTimer).returns.toEqualTypeOf<Timer>();
});
