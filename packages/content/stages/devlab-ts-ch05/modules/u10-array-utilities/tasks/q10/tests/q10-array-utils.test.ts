import { describe, expect, expectTypeOf, test } from "vitest";
import { type Student, averageBy, countBy, groupBy, partition, topN } from "../src/q10-array-utils";

const students = (): Student[] => [
  { name: "山田", grade: 1, score: 80 },
  { name: "佐藤", grade: 2, score: 95 },
  { name: "鈴木", grade: 1, score: 62 },
  { name: "高橋", grade: 2, score: 80 },
  { name: "田中", grade: 3, score: 45 },
];

type KeyFn = (student: Student) => string;

describe("groupBy", () => {
  test("keyFn の値ごとにまとめる", () => {
    const groups = groupBy(students(), (s) => `${s.grade}年`);
    expect(Object.keys(groups)).toEqual(["1年", "2年", "3年"]);
    expect(groups["1年"]?.map((s) => s.name)).toEqual(["山田", "鈴木"]);
    expect(groups["3年"]?.map((s) => s.name)).toEqual(["田中"]);
  });

  test("元の配列は変えない", () => {
    const list = students();
    groupBy(list, (s) => String(s.grade));
    expect(list).toEqual(students());
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(groupBy).parameters.toEqualTypeOf<[readonly Student[], KeyFn]>();
    expectTypeOf(groupBy).returns.toEqualTypeOf<{ [key: string]: Student[] }>();
  });
});

describe("countBy", () => {
  test("keyFn の値ごとに数える", () => {
    expect(countBy(students(), (s) => (s.score >= 60 ? "合格" : "不合格"))).toEqual({
      合格: 4,
      不合格: 1,
    });
    expect(countBy([], (s) => s.name)).toEqual({});
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(countBy).parameters.toEqualTypeOf<[readonly Student[], KeyFn]>();
    expectTypeOf(countBy).returns.toEqualTypeOf<{ [key: string]: number }>();
  });
});

describe("partition", () => {
  test("true と false に分ける", () => {
    const [passed, failed] = partition(students(), (s) => s.score >= 70);
    expect(passed.map((s) => s.name)).toEqual(["山田", "佐藤", "高橋"]);
    expect(failed.map((s) => s.name)).toEqual(["鈴木", "田中"]);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(partition).parameters.toEqualTypeOf<
      [readonly Student[], (student: Student) => boolean]
    >();
    expectTypeOf(partition).returns.toEqualTypeOf<[Student[], Student[]]>();
  });
});

describe("topN", () => {
  test("点数の高い順に n 人。同じ点数は元の順", () => {
    expect(topN(students(), 3).map((s) => s.name)).toEqual(["佐藤", "山田", "高橋"]);
    expect(topN(students(), 10)).toHaveLength(5);
    expect(topN(students(), -1)).toEqual([]);
  });

  test("元の配列は変えない", () => {
    const list = students();
    topN(list, 2);
    expect(list).toEqual(students());
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(topN).parameters.toEqualTypeOf<[readonly Student[], number]>();
    expectTypeOf(topN).returns.toEqualTypeOf<Student[]>();
  });
});

describe("averageBy", () => {
  test("keyFn の値ごとの平均点", () => {
    expect(averageBy(students(), (s) => `${s.grade}年`)).toEqual({
      "1年": 71,
      "2年": 87.5,
      "3年": 45,
    });
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(averageBy).parameters.toEqualTypeOf<[readonly Student[], KeyFn]>();
    expectTypeOf(averageBy).returns.toEqualTypeOf<{ [key: string]: number }>();
  });
});
