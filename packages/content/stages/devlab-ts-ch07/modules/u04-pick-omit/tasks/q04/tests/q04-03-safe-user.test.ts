// このファイルは書き換えないでください
import { expectTypeOf, test } from "vitest";
import { type SafeUser } from "../src/q04-03-safe-user";
test("問3 SafeUser", () => {
  expectTypeOf<SafeUser>().toEqualTypeOf<{
    id: number;
    name: string;
    email: string;
    age: number;
  }>();
});
