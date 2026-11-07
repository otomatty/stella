// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { ageGroup } from "../src/q01-05-age-group";
test("問5 ageGroup", () => {
  expect(ageGroup(17)).toBe("子ども");
  expect(ageGroup(18)).toBe("大人");
  expect(ageGroup(65)).toBe("シニア");
  expectTypeOf(ageGroup).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(ageGroup).returns.toEqualTypeOf<"子ども" | "大人" | "シニア">();
});
