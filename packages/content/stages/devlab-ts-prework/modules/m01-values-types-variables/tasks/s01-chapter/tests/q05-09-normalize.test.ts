// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { normalize } from "../src/q05-09-normalize";
test("問9 normalize", () => {
  expect(normalize("  Hello ")).toBe("hello");
  expect(normalize("ABC")).toBe("abc");
  expectTypeOf(normalize).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(normalize).returns.toEqualTypeOf<string>();
});
