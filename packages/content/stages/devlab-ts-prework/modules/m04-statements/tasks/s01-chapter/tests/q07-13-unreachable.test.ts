// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { unreachable } from "../src/q07-13-unreachable";
test("問13 unreachable", () => {
  expect(() => unreachable()).toThrow("ここには来ないはずです");
  expectTypeOf(unreachable).parameters.toEqualTypeOf<[]>();
  expectTypeOf<[ReturnType<typeof unreachable>]>().toEqualTypeOf<[never]>();
});
