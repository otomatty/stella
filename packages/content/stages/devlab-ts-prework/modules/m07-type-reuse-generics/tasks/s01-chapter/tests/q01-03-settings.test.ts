// このファイルは書き換えないでください
import { expectTypeOf, test } from "vitest";
import { type Settings } from "../src/q01-03-settings";
test("問3 Settings", () => {
  expectTypeOf<Settings>().toEqualTypeOf<{
    theme: string;
    fontSize: number;
    notifications: { email: boolean; push: boolean };
  }>();
});
