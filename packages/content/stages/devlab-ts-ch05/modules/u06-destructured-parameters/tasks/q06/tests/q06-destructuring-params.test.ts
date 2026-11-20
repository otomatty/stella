import { describe, expect, expectTypeOf, test } from "vitest";
import { type User, createUser, formatAddress, searchQuery } from "../src/q06-destructuring-params";

describe("createUser", () => {
  test("省略したプロパティにデフォルト値を入れる", () => {
    expect(createUser({ name: "山田" })).toEqual({ name: "山田", age: 20, role: "member" });
    expect(createUser({ name: "佐藤", age: 35, role: "admin" })).toEqual({
      name: "佐藤",
      age: 35,
      role: "admin",
    });
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(createUser).parameters.toEqualTypeOf<
      [{ name: string; age?: number; role?: "admin" | "member" }]
    >();
    expectTypeOf(createUser).returns.toEqualTypeOf<User>();
  });
});

describe("formatAddress", () => {
  test("住所の形にする", () => {
    expect(
      formatAddress({ zip: "100-0001", pref: "東京都", city: "千代田区", line: "千代田1-1" }),
    ).toBe("〒100-0001 東京都千代田区千代田1-1");
    expect(formatAddress({ zip: "530-0001", pref: "大阪府", city: "大阪市" })).toBe(
      "〒530-0001 大阪府大阪市",
    );
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(formatAddress).parameters.toEqualTypeOf<
      [{ zip: string; pref: string; city: string; line?: string }]
    >();
    expectTypeOf(formatAddress).returns.toEqualTypeOf<string>();
  });
});

describe("searchQuery", () => {
  test("省略したプロパティにデフォルト値を入れる", () => {
    expect(searchQuery({ keyword: "agora" })).toBe("q=agora&limit=10&sort=new");
    expect(searchQuery({ keyword: "会議 室", limit: 5, sort: "popular" })).toBe(
      "q=%E4%BC%9A%E8%AD%B0%20%E5%AE%A4&limit=5&sort=popular",
    );
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(searchQuery).parameters.toEqualTypeOf<
      [{ keyword: string; limit?: number; sort?: "new" | "popular" }]
    >();
    expectTypeOf(searchQuery).returns.toEqualTypeOf<string>();
  });
});
