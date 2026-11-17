// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { splitName } from "../src/q06-12-split-name";
test("問12 splitName", () => {
  expect(splitName("山田 太郎")).toEqual(["山田", "太郎"]);
  expect(splitName("山田")).toEqual(["山田", ""]);
  expectTypeOf(splitName).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(splitName).returns.toEqualTypeOf<[string, string]>();
});
