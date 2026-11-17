// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { toIdMap } from "../src/q07-20-to-id-map";
test("問20 toIdMap", () => {
  const rows = [
    { id: 1, name: "a" },
    { id: 2, name: "b" },
  ];
  expect(toIdMap(rows)).toEqual({ 1: { id: 1, name: "a" }, 2: { id: 2, name: "b" } });
  expectTypeOf(toIdMap(rows)).toEqualTypeOf<Record<number, { id: number; name: string }>>();
});
