// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { fullName } from "../src/q02-06-full-name";
test("問6 fullName", () => {
  expect(fullName("山田", "太郎")).toBe("山田 太郎");
  expectTypeOf(fullName).parameters.toEqualTypeOf<[string, string]>();
  expectTypeOf(fullName).returns.toEqualTypeOf<string>();
});
