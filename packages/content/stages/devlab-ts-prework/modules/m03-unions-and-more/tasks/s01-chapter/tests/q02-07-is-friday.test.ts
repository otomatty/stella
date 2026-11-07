// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isFriday, type Weekday } from "../src/q02-07-is-friday";
test("問7 isFriday", () => {
  expect(isFriday("金")).toBe(true);
  expect(isFriday("月")).toBe(false);
  expectTypeOf(isFriday).parameters.toEqualTypeOf<[Weekday]>();
  expectTypeOf(isFriday).returns.toEqualTypeOf<boolean>();
});
