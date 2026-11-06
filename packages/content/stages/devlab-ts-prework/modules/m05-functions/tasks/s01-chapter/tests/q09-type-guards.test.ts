import { describe, expect, expectTypeOf, test } from "vitest";
import {
  type User,
  assertIsUser,
  isString,
  isUser,
  isUserArray,
  parseUsers,
} from "../src/q09-type-guards";

describe("isString", () => {
  test("文字列なら true", () => {
    expect(isString("a")).toBe(true);
    expect(isString(1)).toBe(false);
  });

  test("型ガード関数になっている", () => {
    expectTypeOf(isString).parameters.toEqualTypeOf<[unknown]>();
    expectTypeOf(isString).guards.toEqualTypeOf<string>();
  });
});

describe("isUser", () => {
  test("User の形なら true", () => {
    expect(isUser({ name: "山田", age: 30 })).toBe(true);
    expect(isUser({ name: "山田", age: "30" })).toBe(false);
    expect(isUser({ name: "山田" })).toBe(false);
    expect(isUser(null)).toBe(false);
    expect(isUser("山田")).toBe(false);
  });

  test("true のとき User に絞り込まれる", () => {
    const value: unknown = { name: "山田", age: 30 };
    if (isUser(value)) {
      expectTypeOf(value).toEqualTypeOf<User>();
      expect(value.name).toBe("山田");
    }
  });

  test("型ガード関数になっている", () => {
    expectTypeOf(isUser).parameters.toEqualTypeOf<[unknown]>();
    expectTypeOf(isUser).guards.toEqualTypeOf<User>();
  });
});

describe("isUserArray", () => {
  test("すべて User の配列なら true", () => {
    expect(isUserArray([{ name: "山田", age: 30 }])).toBe(true);
    expect(isUserArray([])).toBe(true);
    expect(isUserArray([{ name: "山田", age: 30 }, { name: "佐藤" }])).toBe(false);
    expect(isUserArray({ name: "山田", age: 30 })).toBe(false);
  });

  test("型ガード関数になっている", () => {
    expectTypeOf(isUserArray).parameters.toEqualTypeOf<[unknown]>();
    expectTypeOf(isUserArray).guards.toEqualTypeOf<User[]>();
  });
});

describe("assertIsUser", () => {
  test("User でなければ例外を投げる", () => {
    expect(() => {
      assertIsUser({ name: "山田" });
    }).toThrow("User ではありません");
    expect(() => {
      assertIsUser({ name: "山田", age: 30 });
    }).not.toThrow();
  });

  test("アサーション関数になっている", () => {
    expectTypeOf(assertIsUser).parameters.toEqualTypeOf<[unknown]>();
    expectTypeOf(assertIsUser).asserts.toEqualTypeOf<User>();
  });
});

describe("parseUsers", () => {
  test("User の配列を読む", () => {
    expect(parseUsers('[{"name":"山田","age":30}]')).toEqual([{ name: "山田", age: 30 }]);
  });

  test("User の配列でなければ例外を投げる", () => {
    expect(() => parseUsers('[{"name":"山田"}]')).toThrow("User の配列ではありません");
    expect(() => parseUsers('{"name":"山田","age":30}')).toThrow("User の配列ではありません");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(parseUsers).parameters.toEqualTypeOf<[string]>();
    expectTypeOf(parseUsers).returns.toEqualTypeOf<User[]>();
  });
});
