// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { cheapest } from "../src/q05-10-cheapest";
test("問10 cheapest", () => {
  const items = [
    { name: "a", price: 300 },
    { name: "b", price: 100 },
    { name: "c", price: 100 },
  ];
  expect(cheapest(items)?.name).toBe("b");
  expect(cheapest([])).toBeUndefined();
  expectTypeOf(cheapest).parameter(0).toEqualTypeOf<readonly { name: string; price: number }[]>();
  expectTypeOf(cheapest).returns.toEqualTypeOf<{ name: string; price: number } | undefined>();
});
