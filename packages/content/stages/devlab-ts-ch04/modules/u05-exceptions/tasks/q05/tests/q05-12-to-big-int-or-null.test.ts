// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { toBigIntOrNull } from "../src/q05-12-to-big-int-or-null";
test("問12 toBigIntOrNull", () => {
  expect(toBigIntOrNull("123")).toBe(123n);
  expect(toBigIntOrNull("1.5")).toBeNull();
  expectTypeOf(toBigIntOrNull).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(toBigIntOrNull).returns.toEqualTypeOf<bigint | null>();
});
