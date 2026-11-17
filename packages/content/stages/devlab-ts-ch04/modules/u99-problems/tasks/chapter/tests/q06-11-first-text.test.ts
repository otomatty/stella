// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { firstText } from "../src/q06-11-first-text";
test("問11 firstText", () => {
  expect(firstText([1, "a", "b"])).toBe("a");
  expect(firstText([1, 2])).toBeUndefined();
  expectTypeOf(firstText).parameters.toEqualTypeOf<[readonly unknown[]]>();
  expectTypeOf(firstText).returns.toEqualTypeOf<string | undefined>();
});
