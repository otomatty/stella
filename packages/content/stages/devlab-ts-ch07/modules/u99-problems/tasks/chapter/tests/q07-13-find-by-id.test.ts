// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { findById } from "../src/q07-13-find-by-id";
test("問13 findById", () => {
  const rows = [
    { id: 1, name: "a" },
    { id: 2, name: "b" },
  ];
  expect(findById(rows, 2)).toEqual({ id: 2, name: "b" });
  expect(findById(rows, 3)).toBeUndefined();
  expectTypeOf(findById(rows, 2)).toEqualTypeOf<{ id: number; name: string } | undefined>();
});
