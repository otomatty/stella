// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { moreSevere, type LogLevel } from "../src/q07-20-more-severe";
test("問20 moreSevere", () => {
  expect(moreSevere("info", "error")).toBe("error");
  expect(moreSevere("warn", "debug")).toBe("warn");
  expect(moreSevere("info", "info")).toBe("info");
  expectTypeOf(moreSevere).parameters.toEqualTypeOf<[LogLevel, LogLevel]>();
  expectTypeOf(moreSevere).returns.toEqualTypeOf<LogLevel>();
});
