// このファイルは書き換えないでください
import { expectTypeOf, test } from "vitest";
import { type Tag } from "../src/q01-11-tag";
test("問11 Tag", () => {
  expectTypeOf<Tag>().toEqualTypeOf<string>();
});
