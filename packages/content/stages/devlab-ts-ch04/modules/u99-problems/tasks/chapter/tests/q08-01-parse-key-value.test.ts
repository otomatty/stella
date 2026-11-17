// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { parseKeyValue } from "../src/q08-01-parse-key-value";
test("問1 parseKeyValue", () => {
  expect(parseKeyValue("a=1")).toEqual(["a", "1"]);
  expect(parseKeyValue("url=a=b")).toEqual(["url", "a=b"]);
  expect(() => parseKeyValue("abc")).toThrow("= がありません: abc");
  expectTypeOf(parseKeyValue).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseKeyValue).returns.toEqualTypeOf<[string, string]>();
});
