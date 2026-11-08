// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { doNothing } from "../src/q02-14-do-nothing";
test("問14 doNothing", () => {
  expect(() => {
    doNothing();
  }).not.toThrow();
  expectTypeOf(doNothing).parameters.toEqualTypeOf<[]>();
  expectTypeOf(doNothing).returns.toBeVoid();
});
