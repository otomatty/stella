// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { padTwo } from "../src/q03-07-pad-two";
test("問7 padTwo", () => {
  expect(padTwo(5)).toBe("05");
  expect(padTwo(5, 4)).toBe("0005");
  expectTypeOf(padTwo).parameters.toEqualTypeOf<[number, number?]>();
  expectTypeOf(padTwo).returns.toEqualTypeOf<string>();
});
