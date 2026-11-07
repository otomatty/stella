// このファイルは書き換えないでください
import { expectTypeOf, test } from "vitest";
import { type ProductKey } from "../src/q02-02-product-key";
test("問2 ProductKey", () => {
  expectTypeOf<ProductKey>().toEqualTypeOf<"code" | "price" | "stock">();
});
