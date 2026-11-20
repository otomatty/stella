// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { toggleFlag } from "../src/q02-07-toggle-flag";
test("問7 toggleFlag", () => {
  const flags: { [key: string]: boolean } = { dark: false };
  toggleFlag(flags, "dark");
  toggleFlag(flags, "beta");
  expect(flags).toEqual({ dark: true, beta: true });
  expectTypeOf(toggleFlag).parameters.toEqualTypeOf<[{ [key: string]: boolean }, string]>();
  expectTypeOf(toggleFlag).returns.toBeVoid();
});
