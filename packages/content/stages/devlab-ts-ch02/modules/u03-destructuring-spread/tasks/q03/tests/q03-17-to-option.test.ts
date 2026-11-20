// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { toOption, type Item } from "../src/q03-17-to-option";
test("問17 toOption", () => {
  expect(toOption({ id: 1, name: "りんご", price: 150, stock: 12 })).toEqual({
    value: 1,
    label: "りんご",
  });
  expectTypeOf(toOption).parameters.toEqualTypeOf<[Item]>();
  expectTypeOf(toOption).returns.toEqualTypeOf<{ value: number; label: string }>();
});
