// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { parsePort } from "../src/q02-11-parse-port";
test("問11 parsePort", () => {
  expect(parsePort("8080")).toBe(8080);
  expect(parsePort("0")).toBeUndefined();
  expect(parsePort("abc")).toBeUndefined();
  expectTypeOf(parsePort).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parsePort).returns.toEqualTypeOf<number | undefined>();
});
