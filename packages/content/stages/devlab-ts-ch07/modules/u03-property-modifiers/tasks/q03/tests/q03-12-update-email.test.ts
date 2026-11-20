// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { updateEmail, type Profile } from "../src/q03-12-update-email";
test("問12 updateEmail", () => {
  const profile: Readonly<Profile> = { name: "山田" };
  expect(updateEmail(profile, "new@example.com")).toEqual({
    name: "山田",
    email: "new@example.com",
  });
  expect(profile.email).toBeUndefined();
  expectTypeOf(updateEmail).parameters.toEqualTypeOf<[Readonly<Profile>, string]>();
  expectTypeOf(updateEmail).returns.toEqualTypeOf<Readonly<Profile>>();
});
