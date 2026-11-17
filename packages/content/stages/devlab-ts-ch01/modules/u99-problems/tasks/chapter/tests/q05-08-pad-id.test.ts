// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { padId } from "../src/q05-08-pad-id";
test("問8 padId", () => {
  expect(padId(7)).toBe("0007");
  expect(padId(1234)).toBe("1234");
  expectTypeOf(padId).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(padId).returns.toEqualTypeOf<string>();
});
