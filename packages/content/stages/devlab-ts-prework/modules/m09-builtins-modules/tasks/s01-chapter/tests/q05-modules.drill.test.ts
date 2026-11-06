// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  double,
  MAX_ITEMS,
  type Point,
  add,
  sub,
  square,
  withTax,
  priceLabel,
  welcome,
  siteTitle,
  cheapest,
  formatYen,
  taxed,
  greetUser,
  type Product,
  library,
  default as farewell,
  half,
  catalog,
  taxLabel,
  Stack,
} from "../src/q05-modules.drill";

test("問1 double", () => {
  expect(double(4)).toBe(8);
});

test("問2 MAX_ITEMS", () => {
  expect(MAX_ITEMS).toBe(10);
});

test("問3 Point", () => {
  expectTypeOf<Point>().toEqualTypeOf<{ x: number; y: number }>();
});

test("問4 add", () => {
  expect(add(1, 2)).toBe(3);
  expect(sub(5, 3)).toBe(2);
});

test("問5 square", () => {
  expect(square(3)).toBe(9);
});

test("問6 withTax", () => {
  expect(withTax(100)).toBe(110);
  expect(withTax(980)).toBe(1078);
  expectTypeOf(withTax).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(withTax).returns.toEqualTypeOf<number>();
});

test("問7 priceLabel", () => {
  expect(priceLabel(1200)).toBe("1,200円");
  expectTypeOf(priceLabel).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(priceLabel).returns.toEqualTypeOf<string>();
});

test("問8 welcome", () => {
  expect(welcome("山田")).toBe("ようこそ、山田さん！");
  expectTypeOf(welcome).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(welcome).returns.toEqualTypeOf<string>();
});

test("問9 siteTitle", () => {
  expect(siteTitle("商品一覧")).toBe("商品一覧 | サンプル商店");
  expectTypeOf(siteTitle).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(siteTitle).returns.toEqualTypeOf<string>();
});

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

test("問11 formatYen", async () => {
  const lib = await import("../src/q05-modules.lib");
  expect(formatYen).toBe(lib.formatYen);
});

test("問12 taxed", async () => {
  const lib = await import("../src/q05-modules.lib");
  expect(taxed).toBe(lib.priceWithTax);
  expect(taxed(200)).toBe(220);
});

test("問13 greetUser", () => {
  // re-export なら、q05-modules.lib の関数 greet そのものになる
  expect(greetUser.name).toBe("greet");
  expect(greetUser("佐藤")).toBe("ようこそ、佐藤さん");
});

test("問14 Product", () => {
  expectTypeOf<Product>().toEqualTypeOf<{ name: string; price: number }>();
});

test("問15 library", async () => {
  const lib = await import("../src/q05-modules.lib");
  expect(library.SITE_NAME).toBe("サンプル商店");
  expect(library.priceWithTax).toBe(lib.priceWithTax);
});

test("問16 farewell", () => {
  expect(farewell("山田")).toBe("さようなら、山田さん");
});

test("問17 half", () => {
  expect(half(5)).toBe(2.5);
  expectTypeOf(half).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(half).returns.toEqualTypeOf<number>();
});

test("問18 catalog", () => {
  expect(catalog()).toBe("サンプル商店: りんご、みかん、ぶどう");
  expectTypeOf(catalog).parameters.toEqualTypeOf<[]>();
  expectTypeOf(catalog).returns.toEqualTypeOf<string>();
});

test("問19 taxLabel", () => {
  expect(taxLabel()).toBe("消費税 10%");
  expectTypeOf(taxLabel).parameters.toEqualTypeOf<[]>();
  expectTypeOf(taxLabel).returns.toEqualTypeOf<string>();
});

test("問20 Stack", () => {
  const stack = new Stack();
  stack.push(1);
  stack.push(2);
  expect(stack.pop()).toBe(2);
  expect(stack.size).toBe(1);
});
