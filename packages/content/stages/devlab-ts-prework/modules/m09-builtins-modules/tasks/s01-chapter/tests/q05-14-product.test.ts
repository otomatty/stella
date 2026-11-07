// このファイルは書き換えないでください
import { expectTypeOf, test } from "vitest";
import { type Product } from "../src/q05-14-product";
test("問14 Product", () => {
  expectTypeOf<Product>().toEqualTypeOf<{ name: string; price: number }>();
});
