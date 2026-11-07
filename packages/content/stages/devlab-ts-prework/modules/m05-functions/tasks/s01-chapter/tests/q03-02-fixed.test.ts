// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { fixed } from "../src/q03-02-fixed";
test("問2 fixed", () => {
  expect(fixed(3.14159, 2)).toBe("3.14");
  expect(fixed(3.6)).toBe("4");
  expectTypeOf(fixed).parameters.toEqualTypeOf<[number, number?]>();
  expectTypeOf(fixed).returns.toEqualTypeOf<string>();
});
