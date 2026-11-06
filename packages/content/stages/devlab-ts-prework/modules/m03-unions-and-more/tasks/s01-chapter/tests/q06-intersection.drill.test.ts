// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  type Aged,
  type Identified,
  type Named,
  type Priced,
  type Timestamped,
  introduce,
  makePerson,
  withId,
  stamp,
  priceTag,
  isCheap,
  makeItem,
  idLabel,
  olderByOne,
  createdDate,
  makeMember,
  totalOf,
  oldestName,
  type Product,
  productText,
  type Member,
  isAdultAdmin,
  type Post,
  postTitle,
  type Draft,
  type Published,
  publish,
  type Tagged,
  addTag,
  type Discounted,
  finalPrice,
  type Place,
  place,
} from "../src/q06-intersection.drill";

test("問1 introduce", () => {
  expect(introduce({ name: "山田", age: 30 })).toBe("山田（30）");
  expectTypeOf(introduce).parameters.toEqualTypeOf<[Named & Aged]>();
  expectTypeOf(introduce).returns.toEqualTypeOf<string>();
});

test("問2 makePerson", () => {
  expect(makePerson("山田", 30)).toEqual({ name: "山田", age: 30 });
  expectTypeOf(makePerson).parameters.toEqualTypeOf<[string, number]>();
  expectTypeOf(makePerson).returns.toEqualTypeOf<Named & Aged>();
});

test("問3 withId", () => {
  expect(withId({ name: "山田" }, 3)).toEqual({ name: "山田", id: 3 });
  expectTypeOf(withId).parameters.toEqualTypeOf<[Named, number]>();
  expectTypeOf(withId).returns.toEqualTypeOf<Named & Identified>();
});

test("問4 stamp", () => {
  const at = new Date("2026-12-01T09:00:00Z");
  expect(stamp({ name: "メモ" }, at)).toEqual({ name: "メモ", createdAt: at });
  expectTypeOf(stamp).parameters.toEqualTypeOf<[Named, Date]>();
  expectTypeOf(stamp).returns.toEqualTypeOf<Named & Timestamped>();
});

test("問5 priceTag", () => {
  expect(priceTag({ name: "りんご", price: 150 })).toBe("りんご 150円");
  expectTypeOf(priceTag).parameters.toEqualTypeOf<[Named & Priced]>();
  expectTypeOf(priceTag).returns.toEqualTypeOf<string>();
});

test("問6 isCheap", () => {
  expect(isCheap({ name: "りんご", price: 150 }, 200)).toBe(true);
  expect(isCheap({ name: "メロン", price: 1000 }, 200)).toBe(false);
  expectTypeOf(isCheap).parameters.toEqualTypeOf<[Named & Priced, number]>();
  expectTypeOf(isCheap).returns.toEqualTypeOf<boolean>();
});

test("問7 makeItem", () => {
  expect(makeItem("りんご", 150)).toEqual({ name: "りんご", price: 150 });
  expectTypeOf(makeItem).parameters.toEqualTypeOf<[string, number]>();
  expectTypeOf(makeItem).returns.toEqualTypeOf<Named & Priced>();
});

test("問8 idLabel", () => {
  expect(idLabel({ id: 3, name: "山田" })).toBe("#3 山田");
  expectTypeOf(idLabel).parameters.toEqualTypeOf<[Named & Identified]>();
  expectTypeOf(idLabel).returns.toEqualTypeOf<string>();
});

test("問9 olderByOne", () => {
  const person = { name: "山田", age: 30 };
  expect(olderByOne(person)).toEqual({ name: "山田", age: 31 });
  expect(person.age).toBe(30);
  expectTypeOf(olderByOne).parameters.toEqualTypeOf<[Named & Aged]>();
  expectTypeOf(olderByOne).returns.toEqualTypeOf<Named & Aged>();
});

test("問10 createdDate", () => {
  expect(createdDate({ id: 1, createdAt: new Date("2026-12-01T09:00:00Z") })).toBe("2026-12-01");
  expectTypeOf(createdDate).parameters.toEqualTypeOf<[Identified & Timestamped]>();
  expectTypeOf(createdDate).returns.toEqualTypeOf<string>();
});

test("問11 makeMember", () => {
  expect(makeMember("山田", 30, 1)).toEqual({ name: "山田", age: 30, id: 1 });
  expectTypeOf(makeMember).parameters.toEqualTypeOf<[string, number, number]>();
  expectTypeOf(makeMember).returns.toEqualTypeOf<Named & Aged & Identified>();
});

test("問12 totalOf", () => {
  expect(
    totalOf([
      { name: "りんご", price: 150 },
      { name: "みかん", price: 80 },
    ]),
  ).toBe(230);
  expect(totalOf([])).toBe(0);
  expectTypeOf(totalOf).parameters.toEqualTypeOf<[readonly (Named & Priced)[]]>();
  expectTypeOf(totalOf).returns.toEqualTypeOf<number>();
});

test("問13 oldestName", () => {
  expect(
    oldestName([
      { name: "山田", age: 30 },
      { name: "佐藤", age: 45 },
    ]),
  ).toBe("佐藤");
  expect(() => oldestName([])).toThrow(Error);
  expectTypeOf(oldestName).parameters.toEqualTypeOf<[readonly (Named & Aged)[]]>();
  expectTypeOf(oldestName).returns.toEqualTypeOf<string>();
});

test("問14 productText", () => {
  expectTypeOf<Product>().toEqualTypeOf<Named & Priced & Identified>();
  expect(productText({ id: 1, name: "りんご", price: 150 })).toBe("#1 りんご 150円");
  expectTypeOf(productText).parameters.toEqualTypeOf<[Product]>();
  expectTypeOf(productText).returns.toEqualTypeOf<string>();
});

test("問15 isAdultAdmin", () => {
  expectTypeOf<Member>().toEqualTypeOf<Named & Aged & { role: "admin" | "member" }>();
  expect(isAdultAdmin({ name: "山田", age: 30, role: "admin" })).toBe(true);
  expect(isAdultAdmin({ name: "佐藤", age: 30, role: "member" })).toBe(false);
  expect(isAdultAdmin({ name: "鈴木", age: 16, role: "admin" })).toBe(false);
  expectTypeOf(isAdultAdmin).parameters.toEqualTypeOf<[Member]>();
  expectTypeOf(isAdultAdmin).returns.toEqualTypeOf<boolean>();
});

test("問16 postTitle", () => {
  expectTypeOf<Post>().toEqualTypeOf<Identified & Timestamped & { title: string }>();
  expect(
    postTitle({ id: 1, createdAt: new Date("2026-12-01T09:00:00Z"), title: "はじめまして" }),
  ).toBe("#1 はじめまして");
  expectTypeOf(postTitle).parameters.toEqualTypeOf<[Post]>();
  expectTypeOf(postTitle).returns.toEqualTypeOf<string>();
});

test("問17 publish", () => {
  expectTypeOf<Published>().toEqualTypeOf<Draft & { publishedAt: Date }>();
  const at = new Date("2026-12-01T09:00:00Z");
  expect(publish({ title: "お知らせ" }, at)).toEqual({ title: "お知らせ", publishedAt: at });
  expectTypeOf(publish).parameters.toEqualTypeOf<[Draft, Date]>();
  expectTypeOf(publish).returns.toEqualTypeOf<Published>();
});

test("問18 addTag", () => {
  expectTypeOf<Tagged>().toEqualTypeOf<Named & { tags: string[] }>();
  const memo = { name: "メモ", tags: ["a"] };
  expect(addTag(memo, "b")).toEqual({ name: "メモ", tags: ["a", "b"] });
  expect(memo.tags).toEqual(["a"]);
  expectTypeOf(addTag).parameters.toEqualTypeOf<[Tagged, string]>();
  expectTypeOf(addTag).returns.toEqualTypeOf<Tagged>();
});

test("問19 finalPrice", () => {
  expectTypeOf<Discounted>().toEqualTypeOf<Priced & { discount: number }>();
  expect(finalPrice({ price: 1000, discount: 200 })).toBe(800);
  expect(finalPrice({ price: 100, discount: 200 })).toBe(0);
  expectTypeOf(finalPrice).parameters.toEqualTypeOf<[Discounted]>();
  expectTypeOf(finalPrice).returns.toEqualTypeOf<number>();
});

test("問20 place", () => {
  expectTypeOf<Place>().toEqualTypeOf<Named & { lat: number; lng: number }>();
  expect(place("東京駅", 35.68, 139.76)).toEqual({ name: "東京駅", lat: 35.68, lng: 139.76 });
  expectTypeOf(place).parameters.toEqualTypeOf<[string, number, number]>();
  expectTypeOf(place).returns.toEqualTypeOf<Place>();
});
