// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { makePerson, type Named, type Aged } from "../src/q06-02-make-person";
test("問2 makePerson", () => {
  expect(makePerson("山田", 30)).toEqual({ name: "山田", age: 30 });
  expectTypeOf(makePerson).parameters.toEqualTypeOf<[string, number]>();
  expectTypeOf(makePerson).returns.toEqualTypeOf<Named & Aged>();
});
