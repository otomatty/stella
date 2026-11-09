// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { secondsToClock } from "../src/q01-20-seconds-to-clock";
test("問20 secondsToClock", () => {
  expect(secondsToClock(3723)).toBe("01:02:03");
  expect(secondsToClock(59)).toBe("00:00:59");
  expect(secondsToClock(36000)).toBe("10:00:00");
});
