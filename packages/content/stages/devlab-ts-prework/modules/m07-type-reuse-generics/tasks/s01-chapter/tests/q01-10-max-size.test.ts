// このファイルは書き換えないでください
import { expectTypeOf, test } from "vitest";
import { type MaxSize } from "../src/q01-10-max-size";
test("問10 MaxSize", () => {
  expectTypeOf<MaxSize>().toEqualTypeOf<100>();
});
