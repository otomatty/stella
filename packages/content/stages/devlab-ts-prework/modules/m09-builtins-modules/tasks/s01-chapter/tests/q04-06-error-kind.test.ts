// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { errorKind } from "../src/q04-06-error-kind";
test("問6 errorKind", () => {
  class MyTypeError extends TypeError {}
  expect(errorKind(new TypeError("x"))).toBe("TypeError");
  expect(errorKind(new MyTypeError("x"))).toBe("TypeError");
  expect(errorKind(new RangeError("x"))).toBe("RangeError");
  expect(errorKind(new SyntaxError("x"))).toBe("SyntaxError");
  const fake = new Error("x");
  fake.name = "TypeError";
  expect(errorKind(fake)).toBe("Error");
  expect(errorKind("x")).toBe("unknown");
  expectTypeOf(errorKind).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(errorKind).returns.toEqualTypeOf<string>();
});
