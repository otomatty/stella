// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { firstIndexOver } from "../src/q04-11-first-index-over";
test("問11 firstIndexOver", () => {
  expect(firstIndexOver([1, 5, 10], 4)).toBe(1);
  expect(firstIndexOver([1, 2], 4)).toBe(-1);
  expectTypeOf(firstIndexOver).parameters.toEqualTypeOf<[readonly number[], number]>();
  expectTypeOf(firstIndexOver).returns.toEqualTypeOf<number>();
});
