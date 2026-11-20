import { describe, expect, expectTypeOf, test } from "vitest";
import { type User, type UserKey, fieldsText, getField, isUserKey, sortUsers } from "../src/q02-keyof";

const users = (): User[] => [
  { id: 2, name: "佐藤", email: "sato@example.com", age: 41 },
  { id: 1, name: "山田", email: "yamada@example.com", age: 30 },
  { id: 3, name: "鈴木", email: "suzuki@example.com", age: 30 },
];

test("UserKey の型", () => {
  expectTypeOf<UserKey>().toEqualTypeOf<"id" | "name" | "email" | "age">();
});

describe("getField", () => {
  const sample: User = { id: 9, name: "見本", email: "x@example.com", age: 20 };

  test("プロパティの値を返す", () => {
    const [sato] = users();
    if (sato !== undefined) {
      expect(getField(sato, "name")).toBe("佐藤");
      expect(getField(sato, "age")).toBe(41);
    }
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(getField).parameters.toEqualTypeOf<[User, UserKey]>();
    expectTypeOf(getField).returns.toEqualTypeOf<string | number>();
    // @ts-expect-error User にないプロパティ名は渡せない
    expectTypeOf(getField).toBeCallableWith(sample, "password");
  });
});

describe("fieldsText", () => {
  test("指定したプロパティを並べる", () => {
    const [, yamada] = users();
    if (yamada !== undefined) {
      expect(fieldsText(yamada, ["name", "age"])).toBe("name=山田, age=30");
      expect(fieldsText(yamada, [])).toBe("");
    }
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(fieldsText).parameters.toEqualTypeOf<[User, readonly UserKey[]]>();
    expectTypeOf(fieldsText).returns.toEqualTypeOf<string>();
  });
});

describe("sortUsers", () => {
  test("数値のプロパティで並べる。同じ値は元の順", () => {
    expect(sortUsers(users(), "age").map((u) => u.name)).toEqual(["山田", "鈴木", "佐藤"]);
    expect(sortUsers(users(), "id").map((u) => u.id)).toEqual([1, 2, 3]);
  });

  test("文字列のプロパティで並べる", () => {
    expect(sortUsers(users(), "email").map((u) => u.name)).toEqual(["佐藤", "鈴木", "山田"]);
  });

  test("元の配列は変えない", () => {
    const list = users();
    sortUsers(list, "id");
    expect(list.map((u) => u.id)).toEqual([2, 1, 3]);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(sortUsers).parameters.toEqualTypeOf<[readonly User[], UserKey]>();
    expectTypeOf(sortUsers).returns.toEqualTypeOf<User[]>();
  });
});

describe("isUserKey", () => {
  test("UserKey のどれかなら true", () => {
    expect(isUserKey("email")).toBe(true);
    expect(isUserKey("password")).toBe(false);
  });

  test("型ガード関数になっている", () => {
    expectTypeOf(isUserKey).parameters.toEqualTypeOf<[string]>();
    expectTypeOf(isUserKey).guards.toEqualTypeOf<UserKey>();
  });
});
