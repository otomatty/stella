// このファイルは書き換えないでください
import { expectTypeOf, test } from "vitest";
import { type UserOrProductKey } from "../src/q02-05-user-or-product-key";
test("問5 UserOrProductKey", () => {
  expectTypeOf<UserOrProductKey>().toEqualTypeOf<
    "id" | "name" | "email" | "age" | "code" | "price" | "stock"
  >();
});
