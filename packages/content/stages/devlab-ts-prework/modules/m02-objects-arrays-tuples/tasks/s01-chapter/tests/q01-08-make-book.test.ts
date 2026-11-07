// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { makeBook } from "../src/q01-08-make-book";
test("問8 makeBook", () => {
  expect(makeBook("React入門", 2400)).toEqual({ title: "React入門", price: 2400 });
  expectTypeOf(makeBook).parameters.toEqualTypeOf<[string, number]>();
  expectTypeOf(makeBook).returns.toEqualTypeOf<{ title: string; price: number }>();
});
