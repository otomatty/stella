// このファイルは書き換えないでください
import { expectTypeOf, test } from "vitest";
import { type Color } from "../src/q01-05-color";
test("問5 Color", () => {
  expectTypeOf<Color>().toEqualTypeOf<"red" | "green" | "blue">();
});
