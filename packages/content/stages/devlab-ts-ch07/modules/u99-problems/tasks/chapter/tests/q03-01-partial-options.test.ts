// このファイルは書き換えないでください
import { expectTypeOf, test } from "vitest";
import { type PartialOptions } from "../src/q03-01-partial-options";
test("問1 PartialOptions", () => {
  expectTypeOf<PartialOptions>().toEqualTypeOf<{ size?: number; color?: string; bold?: boolean }>();
});
