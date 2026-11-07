// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { indexBy } from "../src/q08-10-index-by";
test("問10 indexBy", () => {
  const rows = [
    { code: "A", n: 1 },
    { code: "B", n: 2 },
    { code: "A", n: 3 },
  ];
  expect(indexBy(rows, (x) => x.code)).toEqual({ A: { code: "A", n: 3 }, B: { code: "B", n: 2 } });
  expectTypeOf(indexBy(rows, (x) => x.code)).toEqualTypeOf<
    Record<string, { code: string; n: number }>
  >();
});
