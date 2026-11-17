import { describe, expect, expectTypeOf, test } from "vitest";
import { type User, displayName, hasNickname } from "../src/q02-optional-readonly";

describe("User", () => {
  test("User の型", () => {
    expectTypeOf<User>().toEqualTypeOf<{ readonly id: number; name: string; nickname?: string }>();
  });

  test("id は書き換えられない", () => {
    const user: User = { id: 1, name: "山田太郎" };
    // @ts-expect-error id は readonly なので代入できない
    user.id = 2;
    user.name = "山田次郎";
    expect(user.name).toBe("山田次郎");
  });
});

describe("displayName", () => {
  test("nickname があれば nickname を返す", () => {
    expect(displayName({ id: 1, name: "山田太郎", nickname: "たろう" })).toBe("たろう");
  });

  test("nickname がなければ name を返す", () => {
    expect(displayName({ id: 2, name: "佐藤花子" })).toBe("佐藤花子");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(displayName).parameters.toEqualTypeOf<[User]>();
    expectTypeOf(displayName).returns.toEqualTypeOf<string>();
  });
});

describe("hasNickname", () => {
  test("nickname の有無を返す", () => {
    expect(hasNickname({ id: 1, name: "山田太郎", nickname: "たろう" })).toBe(true);
    expect(hasNickname({ id: 2, name: "佐藤花子" })).toBe(false);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(hasNickname).parameters.toEqualTypeOf<[User]>();
    expectTypeOf(hasNickname).returns.toEqualTypeOf<boolean>();
  });
});
