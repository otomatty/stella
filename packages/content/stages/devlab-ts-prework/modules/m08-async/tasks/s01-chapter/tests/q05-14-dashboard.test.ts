// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { dashboard } from "../src/q05-14-dashboard";
test("問14 dashboard", async () => {
  await expect(dashboard([1, 3, 9, 4])).resolves.toEqual([
    { name: "山田", postCount: 3 },
    { name: "鈴木", postCount: null },
    { name: "田中", postCount: 0 },
  ]);
  expectTypeOf(dashboard).returns.toEqualTypeOf<
    Promise<{ name: string; postCount: number | null }[]>
  >();
});
