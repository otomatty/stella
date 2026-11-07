// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { definedOnly } from "../src/q09-12-defined-only";
test("問12 definedOnly", () => {
  expect(definedOnly([1, undefined, 2])).toEqual([1, 2]);
  expectTypeOf(definedOnly).parameters.toEqualTypeOf<[readonly (number | undefined)[]]>();
  expectTypeOf(definedOnly).returns.toEqualTypeOf<number[]>();
});
