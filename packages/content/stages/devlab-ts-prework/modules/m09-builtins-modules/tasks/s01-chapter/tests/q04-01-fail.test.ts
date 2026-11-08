// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { fail } from "../src/q04-01-fail";
test("問1 fail", () => {
  expect(() => fail("失敗")).toThrow("失敗");
  expect(() => fail("x")).toThrow(Error);
  expectTypeOf(fail).parameters.toEqualTypeOf<[string]>();
  expectTypeOf<[ReturnType<typeof fail>]>().toEqualTypeOf<[never]>();
});
