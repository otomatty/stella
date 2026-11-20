// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isStatus } from "../src/q07-09-is-status";
test("問9 isStatus", () => {
  expect(isStatus("doing")).toBe(true);
  expect(isStatus("closed")).toBe(false);
  expectTypeOf(isStatus).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(isStatus).returns.toEqualTypeOf<boolean>();
});
