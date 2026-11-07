// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { shout } from "../src/q08-05-shout";
test("問5 shout", () => {
  expect(shout("abc")).toBe("ABC");
  expectTypeOf(shout).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(shout).returns.toEqualTypeOf<string>();
});
