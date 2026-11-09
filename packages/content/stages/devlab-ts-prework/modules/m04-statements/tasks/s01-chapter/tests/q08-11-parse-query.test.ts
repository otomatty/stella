// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { parseQuery } from "../src/q08-11-parse-query";
test("問11 parseQuery", () => {
  expect(parseQuery("a=1&b=2")).toEqual({ a: "1", b: "2" });
  expect(parseQuery("flag&x=y")).toEqual({ flag: "", x: "y" });
  expect(parseQuery("")).toEqual({});
  expectTypeOf(parseQuery).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseQuery).returns.toEqualTypeOf<{ [key: string]: string }>();
});
