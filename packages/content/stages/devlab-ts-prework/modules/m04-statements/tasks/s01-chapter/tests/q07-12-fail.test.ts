// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { fail } from "../src/q07-12-fail";
test("問12 fail", () => {
  expect(() => fail("だめ")).toThrow("だめ");
  expectTypeOf(fail).parameters.toEqualTypeOf<[string]>();
  expectTypeOf<[ReturnType<typeof fail>]>().toEqualTypeOf<[never]>();
});
