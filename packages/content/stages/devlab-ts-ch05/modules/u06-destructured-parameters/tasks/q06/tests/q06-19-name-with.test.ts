// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { nameWith } from "../src/q06-19-name-with";
test("問19 nameWith", () => {
  expect(nameWith({ first: "太郎", last: "山田" })).toBe("山田 太郎");
  expect(nameWith({ first: "太郎", last: "山田" }, "・")).toBe("山田・太郎");
  expectTypeOf(nameWith).parameters.toEqualTypeOf<[{ first: string; last: string }, string?]>();
  expectTypeOf(nameWith).returns.toEqualTypeOf<string>();
});
