// このファイルは書き換えないでください
import { expectTypeOf, test } from "vitest";
import { type Point } from "../src/q01-02-point";
test("問2 Point", () => {
  expectTypeOf<Point>().toEqualTypeOf<{ x: number; y: number }>();
});
