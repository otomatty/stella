// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { canDrive } from "../src/q02-19-can-drive";
test("問19 canDrive", () => {
  expect(canDrive(20, true)).toBe(true);
  expect(canDrive(20, false)).toBe(false);
  expect(canDrive(17, true)).toBe(false);
  expectTypeOf(canDrive).parameters.toEqualTypeOf<[number, boolean]>();
  expectTypeOf(canDrive).returns.toEqualTypeOf<boolean>();
});
