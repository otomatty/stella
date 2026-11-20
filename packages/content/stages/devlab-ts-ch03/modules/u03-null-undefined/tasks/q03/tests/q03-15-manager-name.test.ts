// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { managerName } from "../src/q03-15-manager-name";
test("問15 managerName", () => {
  expect(managerName({ manager: { name: "山田" } })).toBe("山田");
  expect(managerName({ manager: null })).toBe("未定");
  expectTypeOf(managerName).parameters.toEqualTypeOf<[{ manager: { name: string } | null }]>();
  expectTypeOf(managerName).returns.toEqualTypeOf<string>();
});
