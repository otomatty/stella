// このファイルは書き換えないでください
import { expectTypeOf, test } from "vitest";
import { type Notifications } from "../src/q01-04-notifications";
test("問4 Notifications", () => {
  expectTypeOf<Notifications>().toEqualTypeOf<{ email: boolean; push: boolean }>();
});
