// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isValidJson } from "../src/q05-05-is-valid-json";
test("問5 isValidJson", () => {
  expect(isValidJson('{"a":1}')).toBe(true);
  expect(isValidJson("[1, 2]")).toBe(true);
  expect(isValidJson("{a:1}")).toBe(false);
  expectTypeOf(isValidJson).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(isValidJson).returns.toEqualTypeOf<boolean>();
});
