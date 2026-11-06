import { describe, expect, expectTypeOf, test } from "vitest";
import {
  type CategoryTotals,
  type Item,
  applySale,
  inventoryReport,
  outOfStock,
  totalByCategory,
} from "../src/q08-inventory";

const stock = (): Item[] => [
  { name: "ノート", category: "文具", price: 200, stock: 100 },
  { name: "ペン", category: "文具", price: 120, stock: 0 },
  { name: "お茶", category: "飲料", price: 150, stock: 24 },
  { name: "コーヒー", category: "飲料", price: 180, stock: 5 },
];

test("CategoryTotals の型", () => {
  expectTypeOf<CategoryTotals>().toEqualTypeOf<{ [category: string]: number }>();
});

describe("outOfStock", () => {
  test("在庫が0の商品の名前を返す", () => {
    expect(outOfStock(stock())).toEqual(["ペン"]);
    expect(outOfStock([])).toEqual([]);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(outOfStock).parameters.toEqualTypeOf<[readonly Item[]]>();
    expectTypeOf(outOfStock).returns.toEqualTypeOf<string[]>();
  });
});

describe("totalByCategory", () => {
  test("カテゴリごとの在庫金額を合計する", () => {
    expect(totalByCategory(stock())).toEqual({ 文具: 20000, 飲料: 4500 });
  });

  test("空の配列なら空のオブジェクト", () => {
    expect(totalByCategory([])).toEqual({});
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(totalByCategory).parameters.toEqualTypeOf<[readonly Item[]]>();
    expectTypeOf(totalByCategory).returns.toEqualTypeOf<CategoryTotals>();
  });
});

describe("applySale", () => {
  test("指定したカテゴリだけ値引きし、1円未満は切り捨てる", () => {
    expect(applySale(stock(), "飲料", 15).map((item) => item.price)).toEqual([200, 120, 127, 153]);
    expect(applySale(stock(), "文具", 10).map((item) => item.price)).toEqual([180, 108, 150, 180]);
  });

  test("元の配列と商品は変えない", () => {
    const items = stock();
    applySale(items, "飲料", 15);
    expect(items).toEqual(stock());
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(applySale).parameters.toEqualTypeOf<[readonly Item[], string, number]>();
    expectTypeOf(applySale).returns.toEqualTypeOf<Item[]>();
  });
});

describe("inventoryReport", () => {
  test("商品数、在庫切れの数、在庫金額を並べる", () => {
    expect(inventoryReport(stock())).toBe("商品数 4、在庫切れ 1、在庫金額 24,500円");
    expect(inventoryReport([])).toBe("商品数 0、在庫切れ 0、在庫金額 0円");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(inventoryReport).parameters.toEqualTypeOf<[readonly Item[]]>();
    expectTypeOf(inventoryReport).returns.toEqualTypeOf<string>();
  });
});
