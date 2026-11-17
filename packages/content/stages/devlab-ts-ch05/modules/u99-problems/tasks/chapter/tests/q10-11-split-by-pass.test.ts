// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { splitByPass, type Student } from "../src/q10-11-split-by-pass";
test("問11 splitByPass", () => {
  const list = [
    { name: "山田", grade: 1, score: 80 },
    { name: "鈴木", grade: 1, score: 60 },
  ];
  const [passed, failed] = splitByPass(list, 70);
  expect(passed.map((s) => s.name)).toEqual(["山田"]);
  expect(failed.map((s) => s.name)).toEqual(["鈴木"]);
  expectTypeOf(splitByPass).parameters.toEqualTypeOf<[readonly Student[], number]>();
  expectTypeOf(splitByPass).returns.toEqualTypeOf<[Student[], Student[]]>();
});
