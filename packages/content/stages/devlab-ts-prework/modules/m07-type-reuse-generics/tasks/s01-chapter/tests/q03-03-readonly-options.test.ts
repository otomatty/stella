// このファイルは書き換えないでください
import { expectTypeOf, test } from "vitest";
import { type ReadonlyOptions } from "../src/q03-03-readonly-options";
test("問3 ReadonlyOptions", () => {
  expectTypeOf<ReadonlyOptions>().toEqualTypeOf<{
    readonly size: number;
    readonly color: string;
    readonly bold: boolean;
  }>();
});
