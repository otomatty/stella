// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { padValue } from "../src/q01-09-pad-value";
test("問9 padValue", () => {
  expect(padValue(7, 3)).toBe("007");
  expect(padValue("12", 4)).toBe("0012");
  expectTypeOf(padValue).parameters.toEqualTypeOf<[string | number, number]>();
  expectTypeOf(padValue).returns.toEqualTypeOf<string>();
});
