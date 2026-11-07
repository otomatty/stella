// このファイルは書き換えないでください
import { expectTypeOf, test } from "vitest";
import { type NewUser } from "../src/q04-04-new-user";
test("問4 NewUser", () => {
  expectTypeOf<NewUser>().toEqualTypeOf<{
    name: string;
    email: string;
    password: string;
    age: number;
  }>();
});
