// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  type UserKey,
  type ProductKey,
  type SettingKey,
  type ColorName,
  type UserOrProductKey,
  type UserValue,
  type User,
  userField,
  type Product,
  productField,
  settingValue,
  colorCode,
  fieldLabel,
  isUserKey,
  valuesOf,
  differentKeys,
  sortByNumberKey,
  keyCount,
  hasOwnKey,
  productText,
  type UserLabels,
  USER_LABELS,
  totalStock,
} from "../src/q02-keyof.drill";

test("問1 UserKey", () => {
  expectTypeOf<UserKey>().toEqualTypeOf<"id" | "name" | "email" | "age">();
});

test("問2 ProductKey", () => {
  expectTypeOf<ProductKey>().toEqualTypeOf<"code" | "price" | "stock">();
});

test("問3 SettingKey", () => {
  expectTypeOf<SettingKey>().toEqualTypeOf<"theme" | "fontSize" | "beta">();
});

test("問4 ColorName", () => {
  expectTypeOf<ColorName>().toEqualTypeOf<"red" | "green" | "blue">();
});

test("問5 UserOrProductKey", () => {
  expectTypeOf<UserOrProductKey>().toEqualTypeOf<
    "id" | "name" | "email" | "age" | "code" | "price" | "stock"
  >();
});

test("問6 UserValue", () => {
  expectTypeOf<UserValue>().toEqualTypeOf<string | number>();
});

test("問7 userField", () => {
  const user: User = { id: 1, name: "山田", email: "y@example.com", age: 30 };
  expect(userField(user, "name")).toBe("山田");
  expect(userField(user, "age")).toBe(30);
  expectTypeOf(userField).parameters.toEqualTypeOf<[User, "id" | "name" | "email" | "age"]>();
  expectTypeOf(userField).returns.toEqualTypeOf<string | number>();
});

test("問8 productField", () => {
  const product: Product = { code: "A1", price: 150, stock: 3 };
  expect(productField(product, "price")).toBe(150);
  expect(productField(product, "code")).toBe("A1");
  expectTypeOf(productField).parameters.toEqualTypeOf<[Product, "code" | "price" | "stock"]>();
  expectTypeOf(productField).returns.toEqualTypeOf<string | number>();
});

test("問9 settingValue", () => {
  expect(settingValue("fontSize")).toBe(14);
  expect(settingValue("beta")).toBe(false);
  expectTypeOf(settingValue).parameters.toEqualTypeOf<["theme" | "fontSize" | "beta"]>();
  expectTypeOf(settingValue).returns.toEqualTypeOf<string | number | boolean>();
});

test("問10 colorCode", () => {
  expect(colorCode("green")).toBe("#00ff00");
  expectTypeOf(colorCode).parameters.toEqualTypeOf<["red" | "green" | "blue"]>();
  expectTypeOf(colorCode).returns.toEqualTypeOf<string>();
});

test("問11 fieldLabel", () => {
  expect(fieldLabel("id")).toBe("ID");
  expect(fieldLabel("email")).toBe("メール");
  expect(fieldLabel("age")).toBe("年齢");
  expectTypeOf(fieldLabel).parameters.toEqualTypeOf<["id" | "name" | "email" | "age"]>();
  expectTypeOf(fieldLabel).returns.toEqualTypeOf<string>();
});

test("問12 isUserKey", () => {
  expect(isUserKey("email")).toBe(true);
  expect(isUserKey("password")).toBe(false);
  expectTypeOf(isUserKey).guards.toEqualTypeOf<"id" | "name" | "email" | "age">();
});

test("問13 valuesOf", () => {
  const user: User = { id: 1, name: "山田", email: "y@example.com", age: 30 };
  expect(valuesOf(user, ["name", "age"])).toEqual(["山田", 30]);
  expect(valuesOf(user, [])).toEqual([]);
  expectTypeOf(valuesOf).parameters.toEqualTypeOf<
    [User, readonly ("id" | "name" | "email" | "age")[]]
  >();
  expectTypeOf(valuesOf).returns.toEqualTypeOf<(string | number)[]>();
});

test("問14 differentKeys", () => {
  const a: User = { id: 1, name: "山田", email: "y@example.com", age: 30 };
  expect(differentKeys(a, { ...a, age: 31 })).toEqual(["age"]);
  expect(differentKeys(a, a)).toEqual([]);
  expectTypeOf(differentKeys).parameters.toEqualTypeOf<[User, User]>();
  expectTypeOf(differentKeys).returns.toEqualTypeOf<("id" | "name" | "email" | "age")[]>();
});

test("問15 sortByNumberKey", () => {
  const users: User[] = [
    { id: 2, name: "佐藤", email: "s@example.com", age: 41 },
    { id: 1, name: "山田", email: "y@example.com", age: 30 },
  ];
  expect(sortByNumberKey(users, "age").map((u) => u.name)).toEqual(["山田", "佐藤"]);
  expect(sortByNumberKey(users, "id").map((u) => u.id)).toEqual([1, 2]);
  expectTypeOf(sortByNumberKey).parameters.toEqualTypeOf<[readonly User[], "id" | "age"]>();
  expectTypeOf(sortByNumberKey).returns.toEqualTypeOf<User[]>();
});

test("問16 keyCount", () => {
  expect(keyCount({ a: 1, b: 2 })).toBe(2);
  expect(keyCount({})).toBe(0);
  expectTypeOf(keyCount).parameters.toEqualTypeOf<[object]>();
  expectTypeOf(keyCount).returns.toEqualTypeOf<number>();
});

test("問17 hasOwnKey", () => {
  expect(hasOwnKey({ a: 1 }, "a")).toBe(true);
  expect(hasOwnKey({ a: 1 }, "b")).toBe(false);
  expectTypeOf(hasOwnKey).parameters.toEqualTypeOf<[object, string]>();
  expectTypeOf(hasOwnKey).returns.toEqualTypeOf<boolean>();
});

test("問18 productText", () => {
  const product: Product = { code: "A1", price: 150, stock: 3 };
  expect(productText(product, ["code", "price"])).toBe("code=A1, price=150");
  expectTypeOf(productText).parameters.toEqualTypeOf<
    [Product, readonly ("code" | "price" | "stock")[]]
  >();
  expectTypeOf(productText).returns.toEqualTypeOf<string>();
});

test("問19 UserLabels", () => {
  expectTypeOf<UserLabels>().toEqualTypeOf<{
    id: string;
    name: string;
    email: string;
    age: string;
  }>();
  expect(USER_LABELS.email).toBe("メール");
});

test("問20 totalStock", () => {
  const products: Product[] = [
    { code: "A1", price: 150, stock: 3 },
    { code: "B2", price: 80, stock: 5 },
  ];
  expect(totalStock(products, "stock")).toBe(8);
  expect(totalStock(products, "price")).toBe(230);
  expectTypeOf(totalStock).parameters.toEqualTypeOf<[readonly Product[], "price" | "stock"]>();
  expectTypeOf(totalStock).returns.toEqualTypeOf<number>();
});
