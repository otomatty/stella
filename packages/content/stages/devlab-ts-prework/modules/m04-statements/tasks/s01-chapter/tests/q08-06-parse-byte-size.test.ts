// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { parseByteSize } from "../src/q08-06-parse-byte-size";
test("問6 parseByteSize", () => {
  expect(parseByteSize("5B")).toBe(5);
  expect(parseByteSize("2KB")).toBe(2048);
  expect(parseByteSize("1MB")).toBe(1048576);
  expect(() => parseByteSize("3GB")).toThrow("大きさではありません: 3GB");
  expectTypeOf(parseByteSize).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseByteSize).returns.toEqualTypeOf<number>();
});
