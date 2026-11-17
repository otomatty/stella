// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { emptyToNull } from "../src/q03-08-empty-to-null";
test("問8 emptyToNull", () => {
  expect(emptyToNull("")).toBeNull();
  expect(emptyToNull("a")).toBe("a");
  expectTypeOf(emptyToNull).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(emptyToNull).returns.toEqualTypeOf<string | null>();
});
