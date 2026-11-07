// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { sameUser, type UserId } from "../src/q01-18-same-user";
test("問18 sameUser", () => {
  expectTypeOf<UserId>().toEqualTypeOf<string | number>();
  expect(sameUser(1, "1")).toBe(true);
  expect(sameUser(1, 2)).toBe(false);
  expectTypeOf(sameUser).parameters.toEqualTypeOf<[UserId, UserId]>();
  expectTypeOf(sameUser).returns.toEqualTypeOf<boolean>();
});
