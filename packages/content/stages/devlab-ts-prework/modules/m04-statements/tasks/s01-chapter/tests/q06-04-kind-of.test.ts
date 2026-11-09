// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { kindOf } from "../src/q06-04-kind-of";
test("問4 kindOf", () => {
  expect(kindOf(null)).toBe("null");
  expect(kindOf([])).toBe("array");
  expect(kindOf("a")).toBe("string");
  expect(kindOf({})).toBe("object");
  expect(kindOf(undefined)).toBe("undefined");
  expectTypeOf(kindOf).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(kindOf).returns.toEqualTypeOf<string>();
});
