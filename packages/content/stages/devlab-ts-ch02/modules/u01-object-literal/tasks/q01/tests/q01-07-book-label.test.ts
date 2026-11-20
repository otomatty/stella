// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { bookLabel } from "../src/q01-07-book-label";
test("問7 bookLabel", () => {
  expect(bookLabel({ title: "TypeScript入門", price: 2800 })).toBe("TypeScript入門（2,800円）");
  expectTypeOf(bookLabel).parameters.toEqualTypeOf<[{ title: string; price: number }]>();
  expectTypeOf(bookLabel).returns.toEqualTypeOf<string>();
});
