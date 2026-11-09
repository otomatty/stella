// このファイルは書き換えないでください
import { expectTypeOf, test } from "vitest";
import { type ReadonlyProfile } from "../src/q03-04-readonly-profile";
test("問4 ReadonlyProfile", () => {
  expectTypeOf<ReadonlyProfile>().toEqualTypeOf<{
    readonly name: string;
    readonly email?: string;
    readonly age?: number;
  }>();
});
