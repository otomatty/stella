// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { errorName } from "../src/q05-11-error-name";
test("問11 errorName", () => {
  expect(errorName(new Error("x"))).toBe("Error");
  expect(errorName(new RangeError("x"))).toBe("RangeError");
  expect(errorName("x")).toBe("Unknown");
  expectTypeOf(errorName).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(errorName).returns.toEqualTypeOf<string>();
});
