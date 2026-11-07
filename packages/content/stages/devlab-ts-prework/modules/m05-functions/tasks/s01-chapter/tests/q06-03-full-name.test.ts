// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { fullName } from "../src/q06-03-full-name";
test("問3 fullName", () => {
  expect(fullName({ first: "太郎", last: "山田" })).toBe("山田 太郎");
  expectTypeOf(fullName).parameters.toEqualTypeOf<[{ first: string; last: string }]>();
  expectTypeOf(fullName).returns.toEqualTypeOf<string>();
});
