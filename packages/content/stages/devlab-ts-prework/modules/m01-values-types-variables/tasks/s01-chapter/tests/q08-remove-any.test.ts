import { describe, expect, expectTypeOf, test } from "vitest";
import { average, report, toGrade } from "../src/q08-remove-any";

describe("average", () => {
  test("平均を返す", () => {
    expect(average([80, 90, 70])).toBe(80);
    expect(average([55, 60])).toBe(57.5);
  });

  test("空の配列なら Error を投げる", () => {
    expect(() => average([])).toThrow(Error);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(average).parameters.toEqualTypeOf<[number[]]>();
    expectTypeOf(average).returns.toEqualTypeOf<number>();
  });
});

describe("toGrade", () => {
  test("80以上はA、60以上はB、それ未満はC", () => {
    expect(toGrade(80)).toBe("A");
    expect(toGrade(79)).toBe("B");
    expect(toGrade(60)).toBe("B");
    expect(toGrade(59)).toBe("C");
  });

  test("引数の型", () => {
    expectTypeOf(toGrade).parameters.toEqualTypeOf<[number]>();
    // @ts-expect-error 点数に文字列は渡せない
    expectTypeOf(toGrade).toBeCallableWith("80");
  });
});

describe("report", () => {
  test("名前、平均点（小数第1位まで）、評価を並べる", () => {
    expect(report("田中", [80, 90, 70])).toBe("田中さんの平均点は80.0点（A）");
    expect(report("佐藤", [55, 60])).toBe("佐藤さんの平均点は57.5点（C）");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(report).parameters.toEqualTypeOf<[string, number[]]>();
    expectTypeOf(report).returns.toEqualTypeOf<string>();
    // @ts-expect-error 名前に数値は渡せない
    expectTypeOf(report).toBeCallableWith(1, [80]);
  });
});
