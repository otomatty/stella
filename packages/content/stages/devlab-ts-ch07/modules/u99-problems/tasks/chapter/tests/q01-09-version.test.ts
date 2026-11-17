// このファイルは書き換えないでください
import { expectTypeOf, test } from "vitest";
import { type Version } from "../src/q01-09-version";
test("問9 Version", () => {
  expectTypeOf<Version>().toEqualTypeOf<"1.2.3">();
});
