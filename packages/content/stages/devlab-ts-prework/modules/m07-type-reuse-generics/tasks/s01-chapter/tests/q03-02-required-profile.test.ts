// このファイルは書き換えないでください
import { expectTypeOf, test } from "vitest";
import { type RequiredProfile } from "../src/q03-02-required-profile";
test("問2 RequiredProfile", () => {
  expectTypeOf<RequiredProfile>().toEqualTypeOf<{ name: string; email: string; age: number }>();
});
