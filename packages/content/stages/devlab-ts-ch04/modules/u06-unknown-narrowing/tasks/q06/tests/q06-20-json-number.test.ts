// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { jsonNumber } from "../src/q06-20-json-number";
test("問20 jsonNumber", () => {
  expect(jsonNumber("42")).toBe(42);
  expect(jsonNumber('"42"')).toBeNull();
  expect(jsonNumber("{")).toBeNull();
  expectTypeOf(jsonNumber).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(jsonNumber).returns.toEqualTypeOf<number | null>();
});
