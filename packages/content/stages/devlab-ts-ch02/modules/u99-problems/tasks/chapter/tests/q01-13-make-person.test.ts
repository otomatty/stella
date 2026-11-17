// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { makePerson } from "../src/q01-13-make-person";
test("問13 makePerson", () => {
  expect(makePerson("太郎", "山田")).toEqual({ firstName: "太郎", lastName: "山田" });
  expectTypeOf(makePerson).parameters.toEqualTypeOf<[string, string]>();
  expectTypeOf(makePerson).returns.toEqualTypeOf<{ firstName: string; lastName: string }>();
});
