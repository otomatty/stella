// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { firstRepeated } from "../src/q02-17-first-repeated";
test("問17 firstRepeated", () => {
  expect(firstRepeated(["a", "b", "c", "b", "a"])).toBe("b");
  expect(firstRepeated(["a", "b"])).toBeUndefined();
  expectTypeOf(firstRepeated).parameters.toEqualTypeOf<[string[]]>();
  expectTypeOf(firstRepeated).returns.toEqualTypeOf<string | undefined>();
});
