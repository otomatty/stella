import { describe, expect, expectTypeOf, test } from "vitest";
import {
  type Profile,
  changedKeys,
  completeProfile,
  freezeProfile,
  updateProfile,
} from "../src/q03-partial-required-readonly";

const base = (): Profile => ({ name: "山田", email: "y@example.com", bio: "よろしく", age: 30 });

describe("updateProfile", () => {
  test("patch で上書きした新しい Profile", () => {
    const profile = base();
    expect(updateProfile(profile, { bio: "TS を勉強中" })).toEqual({
      ...base(),
      bio: "TS を勉強中",
    });
    expect(updateProfile(profile, {})).toEqual(base());
    expect(profile).toEqual(base());
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(updateProfile).parameters.toEqualTypeOf<[Profile, Partial<Profile>]>();
    expectTypeOf(updateProfile).returns.toEqualTypeOf<Profile>();
  });
});

describe("completeProfile", () => {
  test("すべてそろっていれば返す", () => {
    expect(completeProfile(base())).toEqual(base());
  });

  test("足りなければ Error", () => {
    expect(() => completeProfile({ name: "山田", bio: "x" })).toThrow("email がありません");
    expect(() => completeProfile({})).toThrow("name がありません");
    expect(() => completeProfile({ name: "a", email: "b", bio: "c" })).toThrow("age がありません");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(completeProfile).parameters.toEqualTypeOf<[Partial<Profile>]>();
    expectTypeOf(completeProfile).returns.toEqualTypeOf<Required<Profile>>();
  });
});

describe("freezeProfile", () => {
  test("書き換えられない", () => {
    const profile = base();
    const frozen = freezeProfile(profile);
    expect(frozen).toEqual(base());
    expect(frozen).not.toBe(profile);
    expect(Object.isFrozen(frozen)).toBe(true);
  });

  test("型も読み取り専用", () => {
    expectTypeOf(freezeProfile).returns.toEqualTypeOf<Readonly<Profile>>();
    const frozen = freezeProfile(base());
    expect(() => {
      // @ts-expect-error 読み取り専用なので代入できない
      frozen.name = "佐藤";
    }).toThrow(TypeError);
  });
});

describe("changedKeys", () => {
  test("値が違うプロパティ名", () => {
    expect(changedKeys(base(), { ...base(), age: 31, name: "山田太郎" })).toEqual(["name", "age"]);
    expect(changedKeys(base(), base())).toEqual([]);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(changedKeys).parameters.toEqualTypeOf<[Profile, Profile]>();
    expectTypeOf(changedKeys).returns.toEqualTypeOf<(keyof Profile)[]>();
  });
});
