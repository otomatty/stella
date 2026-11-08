// このファイルは書き換えないでください
import { expectTypeOf, test } from "vitest";
import { type ClickHandler } from "../src/q01-13-click-handler";
test("問13 ClickHandler", () => {
  expectTypeOf<ClickHandler>().toEqualTypeOf<(x: number, y: number) => string>();
});
