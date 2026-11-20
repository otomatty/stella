// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { mergeObjects } from "../src/q07-05-merge-objects";
test("問5 mergeObjects", () => {
  expect(mergeObjects({ a: 1 }, { b: "x" })).toEqual({ a: 1, b: "x" });
  expectTypeOf(mergeObjects({ a: 1 }, { b: "x" })).toEqualTypeOf<{ a: number } & { b: string }>();
  const call = () => {
    // @ts-expect-error 数値はオブジェクトではない
    mergeObjects(1, { b: "x" });
  };
  expect(typeof call).toBe("function");
});
