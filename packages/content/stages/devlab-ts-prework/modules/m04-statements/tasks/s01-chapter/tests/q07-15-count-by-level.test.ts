// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { countByLevel, type LogLevel } from "../src/q07-15-count-by-level";
test("問15 countByLevel", () => {
  expect(countByLevel(["info", "warn", "info"])).toEqual({ debug: 0, info: 2, warn: 1, error: 0 });
  expect(countByLevel([])).toEqual({ debug: 0, info: 0, warn: 0, error: 0 });
  expectTypeOf(countByLevel).parameters.toEqualTypeOf<[readonly LogLevel[]]>();
  expectTypeOf(countByLevel).returns.toEqualTypeOf<{
    debug: number;
    info: number;
    warn: number;
    error: number;
  }>();
});
