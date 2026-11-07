// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { pickLonger } from "../src/q01-17-pick-longer";
test("問17 pickLonger", () => {
  expect(pickLonger("abc", "de")).toBe("abc");
  expect(pickLonger("a", "de")).toBe("de");
  expect(pickLonger("ab", "cd")).toBe("ab");
  expectTypeOf(pickLonger).parameters.toEqualTypeOf<[string, string]>();
  expectTypeOf(pickLonger).returns.toEqualTypeOf<string>();
});
