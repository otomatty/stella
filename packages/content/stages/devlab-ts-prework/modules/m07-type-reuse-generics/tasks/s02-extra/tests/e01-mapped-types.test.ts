import { describe, expect, expectTypeOf, test } from "vitest";
import { type Flags, type Getters, type Nullable, allFlags, toNullable } from "../src/e01-mapped-types";

type User = { name: string; age: number };

describe("型", () => {
  test("Nullable", () => {
    expectTypeOf<Nullable<User>>().toEqualTypeOf<{ name: string | null; age: number | null }>();
  });

  test("Flags", () => {
    expectTypeOf<Flags<User>>().toEqualTypeOf<{ name: boolean; age: boolean }>();
  });

  test("Getters", () => {
    expectTypeOf<Getters<User>>().toEqualTypeOf<{ name: () => string; age: () => number }>();
  });
});

describe("allFlags", () => {
  test("すべてのキーに value を入れる", () => {
    expect(allFlags({ name: "山田", age: 30 }, true)).toEqual({ name: true, age: true });
    expect(allFlags({}, false)).toEqual({});
  });

  test("戻り値の型", () => {
    const user: User = { name: "山田", age: 30 };
    expectTypeOf(allFlags(user, true)).toEqualTypeOf<Flags<User>>();
  });
});

describe("toNullable", () => {
  test("同じ中身のコピーを返す", () => {
    const user: User = { name: "山田", age: 30 };
    const result = toNullable(user);
    expect(result).toEqual(user);
    expect(result).not.toBe(user);
    result.name = null;
    expect(user.name).toBe("山田");
  });

  test("戻り値の型", () => {
    const user: User = { name: "山田", age: 30 };
    expectTypeOf(toNullable(user)).toEqualTypeOf<Nullable<User>>();
  });
});
