// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { logTo } from "../src/q02-01-log-to";
test("問1 logTo", () => {
  const lines: string[] = [];
  logTo(lines, "start");
  logTo(lines, "end");
  expect(lines).toEqual(["start", "end"]);
  expectTypeOf(logTo).parameters.toEqualTypeOf<[string[], string]>();
  expectTypeOf(logTo).returns.toBeVoid();
});
