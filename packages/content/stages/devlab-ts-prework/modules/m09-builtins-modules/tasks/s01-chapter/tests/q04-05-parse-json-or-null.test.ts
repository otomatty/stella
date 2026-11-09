// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { parseJsonOrNull } from "../src/q04-05-parse-json-or-null";
test("問5 parseJsonOrNull", () => {
  expect(parseJsonOrNull('{"a":1}')).toEqual({ a: 1 });
  expect(parseJsonOrNull("[1, 2]")).toEqual([1, 2]);
  expect(parseJsonOrNull("{a:1}")).toBeNull();
  expect(parseJsonOrNull("")).toBeNull();
  expectTypeOf(parseJsonOrNull).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseJsonOrNull).returns.toEqualTypeOf<unknown>();
});
