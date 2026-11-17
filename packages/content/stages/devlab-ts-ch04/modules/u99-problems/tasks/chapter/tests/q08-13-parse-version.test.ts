// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { parseVersion } from "../src/q08-13-parse-version";
test("問13 parseVersion", () => {
  expect(parseVersion("1.12.0")).toEqual([1, 12, 0]);
  expect(() => parseVersion("1.2")).toThrow("バージョンではありません: 1.2");
  expectTypeOf(parseVersion).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseVersion).returns.toEqualTypeOf<[number, number, number]>();
});
