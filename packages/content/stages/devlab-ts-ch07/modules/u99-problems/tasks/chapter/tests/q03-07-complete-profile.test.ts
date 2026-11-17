// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { completeProfile, type Profile } from "../src/q03-07-complete-profile";
test("問7 completeProfile", () => {
  expect(completeProfile({ name: "山田" })).toEqual({ name: "山田", email: "", age: 0 });
  expect(completeProfile({ name: "山田", email: "y@example.com", age: 30 })).toEqual({
    name: "山田",
    email: "y@example.com",
    age: 30,
  });
  expectTypeOf(completeProfile).parameters.toEqualTypeOf<[Profile]>();
  expectTypeOf(completeProfile).returns.toEqualTypeOf<Required<Profile>>();
});
