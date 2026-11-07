// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { greetByName, type User } from "../src/q03-13-greet-by-name";
test("問13 greetByName", () => {
  expect(greetByName({ id: 1, name: "山田", age: 30, email: "y@example.com" })).toBe(
    "こんにちは、山田さん",
  );
  expectTypeOf(greetByName).parameters.toEqualTypeOf<[User]>();
  expectTypeOf(greetByName).returns.toEqualTypeOf<string>();
});
