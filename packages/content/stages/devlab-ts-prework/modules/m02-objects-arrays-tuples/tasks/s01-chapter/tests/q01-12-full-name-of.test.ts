// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { fullNameOf } from "../src/q01-12-full-name-of";
test("問12 fullNameOf", () => {
  expect(fullNameOf({ firstName: "太郎", lastName: "山田" })).toBe("山田 太郎");
  expectTypeOf(fullNameOf).parameters.toEqualTypeOf<[{ firstName: string; lastName: string }]>();
  expectTypeOf(fullNameOf).returns.toEqualTypeOf<string>();
});
