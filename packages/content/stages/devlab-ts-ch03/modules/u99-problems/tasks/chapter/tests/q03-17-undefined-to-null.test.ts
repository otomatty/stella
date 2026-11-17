// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { undefinedToNull } from "../src/q03-17-undefined-to-null";
test("問17 undefinedToNull", () => {
  expect(undefinedToNull(undefined)).toBeNull();
  expect(undefinedToNull("a")).toBe("a");
  expectTypeOf(undefinedToNull).parameters.toEqualTypeOf<[string | undefined]>();
  expectTypeOf(undefinedToNull).returns.toEqualTypeOf<string | null>();
});
