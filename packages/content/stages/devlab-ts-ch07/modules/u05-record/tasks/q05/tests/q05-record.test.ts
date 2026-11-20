import { describe, expect, expectTypeOf, test } from "vitest";
import {
  CATEGORY_LABELS,
  type Category,
  type Item,
  countByCategory,
  indexByName,
  totalByCategory,
} from "../src/q05-record";

const items = (): Item[] => [
  { name: "パン", category: "food", price: 200 },
  { name: "お茶", category: "drink", price: 150 },
  { name: "おにぎり", category: "food", price: 130 },
];

describe("countByCategory", () => {
  test("すべてのカテゴリの数を返す", () => {
    expect(countByCategory(items())).toEqual({ food: 2, drink: 1, other: 0 });
    expect(countByCategory([])).toEqual({ food: 0, drink: 0, other: 0 });
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(countByCategory).parameters.toEqualTypeOf<[readonly Item[]]>();
    expectTypeOf(countByCategory).returns.toEqualTypeOf<Record<Category, number>>();
  });
});

describe("totalByCategory", () => {
  test("カテゴリごとの合計", () => {
    expect(totalByCategory(items())).toEqual({ food: 330, drink: 150, other: 0 });
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(totalByCategory).parameters.toEqualTypeOf<[readonly Item[]]>();
    expectTypeOf(totalByCategory).returns.toEqualTypeOf<Record<Category, number>>();
  });
});

describe("CATEGORY_LABELS", () => {
  test("値と型", () => {
    expect(CATEGORY_LABELS).toEqual({ food: "食べ物", drink: "飲み物", other: "その他" });
    expectTypeOf(CATEGORY_LABELS).toEqualTypeOf<Record<Category, string>>();
  });
});

describe("indexByName", () => {
  test("名前で引けるようにする", () => {
    const index = indexByName(items());
    expect(index).toHaveProperty("お茶", { name: "お茶", category: "drink", price: 150 });
    expect(Object.keys(index)).toEqual(["パン", "お茶", "おにぎり"]);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(indexByName).parameters.toEqualTypeOf<[readonly Item[]]>();
    expectTypeOf(indexByName).returns.toEqualTypeOf<Record<string, Item>>();
  });
});
