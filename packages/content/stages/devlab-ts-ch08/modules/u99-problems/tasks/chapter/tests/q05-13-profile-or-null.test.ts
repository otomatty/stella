// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { profileOrNull, type User, type Post } from "../src/q05-13-profile-or-null";
test("問13 profileOrNull", async () => {
  const profile = await profileOrNull(2);
  expect(profile?.user.name).toBe("佐藤");
  await expect(profileOrNull(3)).resolves.toBeNull();
  await expect(profileOrNull(9)).resolves.toBeNull();
  expectTypeOf(profileOrNull).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(profileOrNull).returns.toEqualTypeOf<
    Promise<{ user: User; posts: Post[] } | null>
  >();
});
