// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { rename } from "../src/q02-04-rename";
test("問4 rename", () => {
  const user = { name: "山田" };
  rename(user, "佐藤");
  expect(user.name).toBe("佐藤");
  expectTypeOf(rename).parameters.toEqualTypeOf<[{ name: string }, string]>();
  expectTypeOf(rename).returns.toBeVoid();
});
