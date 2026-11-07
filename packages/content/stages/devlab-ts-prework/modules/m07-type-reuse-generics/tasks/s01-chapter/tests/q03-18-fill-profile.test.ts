// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { fillProfile, type Profile } from "../src/q03-18-fill-profile";
test("問18 fillProfile", () => {
  expect(fillProfile({ name: "山田" }, { name: "", email: "-", age: 0 })).toEqual({
    name: "山田",
    email: "-",
    age: 0,
  });
  expectTypeOf(fillProfile).parameters.toEqualTypeOf<[Profile, Required<Profile>]>();
  expectTypeOf(fillProfile).returns.toEqualTypeOf<Required<Profile>>();
});
