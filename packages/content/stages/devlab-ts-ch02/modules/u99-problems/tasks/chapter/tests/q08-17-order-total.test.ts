// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { orderTotal } from "../src/q08-17-order-total";
test("問17 orderTotal", () => {
  expect(orderTotal({ りんご: 150, みかん: 80 }, { りんご: 2, みかん: 3 })).toBe(540);
  expect(() => orderTotal({ りんご: 150 }, { メロン: 1 })).toThrow(Error);
  expectTypeOf(orderTotal).parameters.toEqualTypeOf<
    [{ [item: string]: number }, { [item: string]: number }]
  >();
  expectTypeOf(orderTotal).returns.toEqualTypeOf<number>();
});
