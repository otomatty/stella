// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { SIZE_PX, sizePx } from "../src/q07-17-size-px";
test("問17 sizePx", () => {
  expectTypeOf<typeof SIZE_PX>().toEqualTypeOf<{
    readonly S: 12;
    readonly M: 16;
    readonly L: 20;
  }>();
  expect(sizePx("L")).toBe(20);
  expectTypeOf(sizePx).parameters.toEqualTypeOf<["S" | "M" | "L"]>();
  expectTypeOf(sizePx).returns.toEqualTypeOf<number>();
});
