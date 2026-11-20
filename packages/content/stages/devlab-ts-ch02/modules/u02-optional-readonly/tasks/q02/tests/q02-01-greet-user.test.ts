// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { greetUser } from "../src/q02-01-greet-user";
test("問1 greetUser", () => {
  expect(greetUser({ name: "山田太郎", nickname: "たろう" })).toBe("こんにちは、たろうさん");
  expect(greetUser({ name: "佐藤花子" })).toBe("こんにちは、佐藤花子さん");
  expectTypeOf(greetUser).parameters.toEqualTypeOf<[{ name: string; nickname?: string }]>();
  expectTypeOf(greetUser).returns.toEqualTypeOf<string>();
});
