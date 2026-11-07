// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { fruitPrice, type Fruit } from "../src/q07-02-fruit-price";
test("問2 fruitPrice", () => {
  expect(fruitPrice("apple")).toBe(150);
  expect(fruitPrice("banana")).toBe(100);
  expect(fruitPrice("cherry")).toBe(500);
  expectTypeOf(fruitPrice).parameters.toEqualTypeOf<[Fruit]>();
  expectTypeOf(fruitPrice).returns.toEqualTypeOf<number>();
});
