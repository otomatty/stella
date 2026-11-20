// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { namesOf, type Student } from "../src/q10-01-names-of";
test("問1 namesOf", () => {
  expect(
    namesOf([
      { name: "山田", grade: 1, score: 80 },
      { name: "佐藤", grade: 2, score: 95 },
    ]),
  ).toEqual(["山田", "佐藤"]);
  expectTypeOf(namesOf).parameters.toEqualTypeOf<[readonly Student[]]>();
  expectTypeOf(namesOf).returns.toEqualTypeOf<string[]>();
});
