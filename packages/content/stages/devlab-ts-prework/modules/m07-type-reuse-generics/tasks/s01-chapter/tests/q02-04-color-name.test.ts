// このファイルは書き換えないでください
import { expectTypeOf, test } from "vitest";
import { type ColorName } from "../src/q02-04-color-name";
test("問4 ColorName", () => {
  expectTypeOf<ColorName>().toEqualTypeOf<"red" | "green" | "blue">();
});
