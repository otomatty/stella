// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { checkWithLog } from "../src/q05-19-check-with-log";
test("問19 checkWithLog", () => {
  const log: string[] = [];
  expect(checkWithLog(log, "1")).toBe(true);
  expect(checkWithLog(log, "{")).toBe(false);
  expect(log).toEqual(["checked", "checked"]);
  expectTypeOf(checkWithLog).parameters.toEqualTypeOf<[string[], string]>();
  expectTypeOf(checkWithLog).returns.toEqualTypeOf<boolean>();
});
