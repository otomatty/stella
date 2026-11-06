import { describe, expect, expectTypeOf, test } from "vitest";
import { getProperty, longest, pluck, withId } from "../src/q07-constraints";

const user = { name: "山田", age: 30 };

describe("getProperty", () => {
  test("プロパティの値を返す", () => {
    expect(getProperty(user, "age")).toBe(30);
    expect(getProperty(user, "name")).toBe("山田");
  });

  test("戻り値の型はそのプロパティの型", () => {
    expectTypeOf(getProperty(user, "age")).toEqualTypeOf<number>();
    expectTypeOf(getProperty(user, "name")).toEqualTypeOf<string>();
  });

  test("ないプロパティ名は渡せない", () => {
    const call = () => {
      // @ts-expect-error email は user のプロパティではない
      getProperty(user, "email");
    };
    expect(typeof call).toBe("function");
  });
});

describe("longest", () => {
  test("長い方を返す", () => {
    expect(longest("abc", "de")).toBe("abc");
    expect(longest([1, 2], [3])).toEqual([1, 2]);
    expect(longest("ab", "cd")).toBe("ab");
  });

  test("戻り値の型は渡した型", () => {
    const a = user.name;
    expectTypeOf(longest(a, a)).toEqualTypeOf<string>();
    const list = [1, 2];
    expectTypeOf(longest(list, list)).toEqualTypeOf<number[]>();
  });

  test("length のない値は渡せない", () => {
    const call = () => {
      // @ts-expect-error 数値には length がない
      longest(1, 2);
    };
    expect(typeof call).toBe("function");
  });
});

describe("pluck", () => {
  test("key の値を並べる", () => {
    expect(pluck([{ id: 1 }, { id: 2 }], "id")).toEqual([1, 2]);
    expect(pluck([user], "name")).toEqual(["山田"]);
  });

  test("戻り値の型", () => {
    expectTypeOf(pluck([user], "age")).toEqualTypeOf<number[]>();
    expectTypeOf(pluck([user], "name")).toEqualTypeOf<string[]>();
  });
});

describe("withId", () => {
  test("id を足した新しいオブジェクト", () => {
    const result = withId(user, 7);
    expect(result).toEqual({ name: "山田", age: 30, id: 7 });
    expect(result).not.toBe(user);
  });

  test("戻り値の型", () => {
    expectTypeOf(withId(user, 7)).toEqualTypeOf<{ name: string; age: number } & { id: number }>();
  });

  test("オブジェクト以外は渡せない", () => {
    const call = () => {
      // @ts-expect-error 文字列はオブジェクトではない
      withId("山田", 7);
    };
    expect(typeof call).toBe("function");
  });
});
