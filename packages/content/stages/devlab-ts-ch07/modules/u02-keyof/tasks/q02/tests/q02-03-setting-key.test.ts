// このファイルは書き換えないでください
import { expectTypeOf, test } from "vitest";
import { type SettingKey } from "../src/q02-03-setting-key";
test("問3 SettingKey", () => {
  expectTypeOf<SettingKey>().toEqualTypeOf<"theme" | "fontSize" | "beta">();
});
