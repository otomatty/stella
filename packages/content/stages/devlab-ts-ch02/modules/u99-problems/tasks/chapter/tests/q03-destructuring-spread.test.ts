import { describe, expect, expectTypeOf, test } from "vitest";
import { type Product, restock, summary, updatePrice } from "../src/q03-destructuring-spread";

const apple = (): Product => ({ id: 1, name: "りんご", price: 150, stock: 12 });

describe("updatePrice", () => {
  test("price だけを変えた新しいオブジェクトを返す", () => {
    const product = apple();
    const updated = updatePrice(product, 120);
    expect(updated).toEqual({ id: 1, name: "りんご", price: 120, stock: 12 });
    expect(updated).not.toBe(product);
  });

  test("元のオブジェクトは変えない", () => {
    const product = apple();
    updatePrice(product, 120);
    expect(product).toEqual(apple());
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(updatePrice).parameters.toEqualTypeOf<[Product, number]>();
    expectTypeOf(updatePrice).returns.toEqualTypeOf<Product>();
  });
});

describe("restock", () => {
  test("stock を増やした新しいオブジェクトを返し、元は変えない", () => {
    const product = apple();
    expect(restock(product, 8)).toEqual({ id: 1, name: "りんご", price: 150, stock: 20 });
    expect(product).toEqual(apple());
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(restock).parameters.toEqualTypeOf<[Product, number]>();
    expectTypeOf(restock).returns.toEqualTypeOf<Product>();
  });
});

describe("summary", () => {
  test("名前、価格、在庫を並べる", () => {
    expect(summary(apple())).toBe("りんご: 150円（在庫 12）");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(summary).parameters.toEqualTypeOf<[Product]>();
    expectTypeOf(summary).returns.toEqualTypeOf<string>();
  });
});
