// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  type Item,
  type User,
  itemLabel,
  setPrice,
  setStock,
  addStock,
  rename,
  userSummary,
  birthday,
  changeEmail,
  pickIdName,
  mergeUser,
  copyItem,
  discountItem,
  greetByName,
  isExpensive,
  stockValue,
  resetStock,
  toOption,
  withDefaults,
  combine,
  withTax,
} from "../src/q03-destructuring-spread.drill";

test("問1 itemLabel", () => {
  expect(itemLabel({ id: 1, name: "りんご", price: 150, stock: 12 })).toBe("りんご 150円");
  expectTypeOf(itemLabel).parameters.toEqualTypeOf<[Item]>();
  expectTypeOf(itemLabel).returns.toEqualTypeOf<string>();
});

test("問2 setPrice", () => {
  const item: Item = { id: 1, name: "りんご", price: 150, stock: 12 };
  expect(setPrice(item, 120)).toEqual({ id: 1, name: "りんご", price: 120, stock: 12 });
  expect(item.price).toBe(150);
  expectTypeOf(setPrice).parameters.toEqualTypeOf<[Item, number]>();
  expectTypeOf(setPrice).returns.toEqualTypeOf<Item>();
});

test("問3 setStock", () => {
  const item: Item = { id: 1, name: "りんご", price: 150, stock: 12 };
  expect(setStock(item, 0)).toEqual({ id: 1, name: "りんご", price: 150, stock: 0 });
  expect(item.stock).toBe(12);
  expectTypeOf(setStock).parameters.toEqualTypeOf<[Item, number]>();
  expectTypeOf(setStock).returns.toEqualTypeOf<Item>();
});

test("問4 addStock", () => {
  const item: Item = { id: 1, name: "りんご", price: 150, stock: 12 };
  expect(addStock(item, 8).stock).toBe(20);
  expect(item.stock).toBe(12);
  expectTypeOf(addStock).parameters.toEqualTypeOf<[Item, number]>();
  expectTypeOf(addStock).returns.toEqualTypeOf<Item>();
});

test("問5 rename", () => {
  const item: Item = { id: 1, name: "りんご", price: 150, stock: 12 };
  expect(rename(item, "青りんご")).toEqual({ id: 1, name: "青りんご", price: 150, stock: 12 });
  expect(item.name).toBe("りんご");
  expectTypeOf(rename).parameters.toEqualTypeOf<[Item, string]>();
  expectTypeOf(rename).returns.toEqualTypeOf<Item>();
});

test("問6 userSummary", () => {
  expect(userSummary({ id: 1, name: "山田", age: 30, email: "y@example.com" })).toBe("山田（30）");
  expectTypeOf(userSummary).parameters.toEqualTypeOf<[User]>();
  expectTypeOf(userSummary).returns.toEqualTypeOf<string>();
});

test("問7 birthday", () => {
  const user: User = { id: 1, name: "山田", age: 30, email: "y@example.com" };
  expect(birthday(user).age).toBe(31);
  expect(user.age).toBe(30);
  expectTypeOf(birthday).parameters.toEqualTypeOf<[User]>();
  expectTypeOf(birthday).returns.toEqualTypeOf<User>();
});

test("問8 changeEmail", () => {
  const user: User = { id: 1, name: "山田", age: 30, email: "y@example.com" };
  expect(changeEmail(user, "new@example.com")).toEqual({
    id: 1,
    name: "山田",
    age: 30,
    email: "new@example.com",
  });
  expect(user.email).toBe("y@example.com");
  expectTypeOf(changeEmail).parameters.toEqualTypeOf<[User, string]>();
  expectTypeOf(changeEmail).returns.toEqualTypeOf<User>();
});

test("問9 pickIdName", () => {
  expect(pickIdName({ id: 1, name: "山田", age: 30, email: "y@example.com" })).toEqual({
    id: 1,
    name: "山田",
  });
  expectTypeOf(pickIdName).parameters.toEqualTypeOf<[User]>();
  expectTypeOf(pickIdName).returns.toEqualTypeOf<{ id: number; name: string }>();
});

test("問10 mergeUser", () => {
  const user: User = { id: 1, name: "山田", age: 30, email: "y@example.com" };
  expect(mergeUser(user, { name: "山田太郎", email: "t@example.com" })).toEqual({
    id: 1,
    name: "山田太郎",
    age: 30,
    email: "t@example.com",
  });
  expect(user.name).toBe("山田");
  expectTypeOf(mergeUser).parameters.toEqualTypeOf<[User, { name: string; email: string }]>();
  expectTypeOf(mergeUser).returns.toEqualTypeOf<User>();
});

test("問11 copyItem", () => {
  const item: Item = { id: 1, name: "りんご", price: 150, stock: 12 };
  const copied = copyItem(item);
  expect(copied).toEqual(item);
  expect(copied).not.toBe(item);
  expectTypeOf(copyItem).parameters.toEqualTypeOf<[Item]>();
  expectTypeOf(copyItem).returns.toEqualTypeOf<Item>();
});

test("問12 discountItem", () => {
  const item: Item = { id: 1, name: "りんご", price: 150, stock: 12 };
  expect(discountItem(item, 10).price).toBe(135);
  expect(discountItem(item, 15).price).toBe(127);
  expect(item.price).toBe(150);
  expectTypeOf(discountItem).parameters.toEqualTypeOf<[Item, number]>();
  expectTypeOf(discountItem).returns.toEqualTypeOf<Item>();
});

test("問13 greetByName", () => {
  expect(greetByName({ id: 1, name: "山田", age: 30, email: "y@example.com" })).toBe(
    "こんにちは、山田さん",
  );
  expectTypeOf(greetByName).parameters.toEqualTypeOf<[User]>();
  expectTypeOf(greetByName).returns.toEqualTypeOf<string>();
});

test("問14 isExpensive", () => {
  expect(isExpensive({ id: 1, name: "りんご", price: 150, stock: 12 })).toBe(false);
  expect(isExpensive({ id: 2, name: "メロン", price: 1000, stock: 1 })).toBe(true);
  expectTypeOf(isExpensive).parameters.toEqualTypeOf<[Item]>();
  expectTypeOf(isExpensive).returns.toEqualTypeOf<boolean>();
});

test("問15 stockValue", () => {
  expect(stockValue({ id: 1, name: "りんご", price: 150, stock: 12 })).toBe(1800);
  expectTypeOf(stockValue).parameters.toEqualTypeOf<[Item]>();
  expectTypeOf(stockValue).returns.toEqualTypeOf<number>();
});

test("問16 resetStock", () => {
  const item: Item = { id: 1, name: "りんご", price: 150, stock: 12 };
  expect(resetStock(item).stock).toBe(0);
  expect(item.stock).toBe(12);
  expectTypeOf(resetStock).parameters.toEqualTypeOf<[Item]>();
  expectTypeOf(resetStock).returns.toEqualTypeOf<Item>();
});

test("問17 toOption", () => {
  expect(toOption({ id: 1, name: "りんご", price: 150, stock: 12 })).toEqual({
    value: 1,
    label: "りんご",
  });
  expectTypeOf(toOption).parameters.toEqualTypeOf<[Item]>();
  expectTypeOf(toOption).returns.toEqualTypeOf<{ value: number; label: string }>();
});

test("問18 withDefaults", () => {
  expect(withDefaults({ color: "red" })).toEqual({ size: 10, color: "red" });
  expect(withDefaults({})).toEqual({ size: 10, color: "black" });
  expect(withDefaults({ size: 20, color: "blue" })).toEqual({ size: 20, color: "blue" });
  expectTypeOf(withDefaults).parameters.toEqualTypeOf<[{ size?: number; color?: string }]>();
  expectTypeOf(withDefaults).returns.toEqualTypeOf<{ size: number; color: string }>();
});

test("問19 combine", () => {
  expect(combine({ x: 1 }, { y: 2 })).toEqual({ x: 1, y: 2 });
  expectTypeOf(combine).parameters.toEqualTypeOf<[{ x: number }, { y: number }]>();
  expectTypeOf(combine).returns.toEqualTypeOf<{ x: number; y: number }>();
});

test("問20 withTax", () => {
  const item: Item = { id: 1, name: "りんご", price: 150, stock: 12 };
  expect(withTax(item).price).toBe(165);
  expect(item.price).toBe(150);
  expectTypeOf(withTax).parameters.toEqualTypeOf<[Item]>();
  expectTypeOf(withTax).returns.toEqualTypeOf<Item>();
});
