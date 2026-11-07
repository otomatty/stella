// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isSuccess } from "../src/q07-07-is-success";
test("問7 isSuccess", () => {
  expect(isSuccess(200)).toBe(true);
  expect(isSuccess(404)).toBe(false);
  expectTypeOf(isSuccess).parameters.toEqualTypeOf<[200 | 404 | 500]>();
  expectTypeOf(isSuccess).returns.toEqualTypeOf<boolean>();
});
