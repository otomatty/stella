// このファイルは書き換えないでください
import { expectTypeOf, test } from "vitest";
import { type Level } from "../src/q01-06-level";
test("問6 Level", () => {
  expectTypeOf<Level>().toEqualTypeOf<1 | 2 | 3>();
});
