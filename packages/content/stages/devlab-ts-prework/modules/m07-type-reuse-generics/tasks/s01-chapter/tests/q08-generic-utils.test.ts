import { describe, expect, expectTypeOf, test } from "vitest";
import { chunk, countBy, groupBy, partition, sortBy, uniqueBy } from "../src/q08-generic-utils";

type Member = { name: string; team: string; age: number };

const members = (): Member[] => [
  { name: "山田", team: "A", age: 30 },
  { name: "佐藤", team: "B", age: 25 },
  { name: "鈴木", team: "A", age: 41 },
];
const words = ["apple", "avocado", "banana"];

describe("groupBy", () => {
  test("どんな配列でもまとめられる", () => {
    const byTeam = groupBy(members(), (m) => m.team);
    expect(byTeam.A?.map((m) => m.name)).toEqual(["山田", "鈴木"]);
    expect(groupBy(words, (w) => w.slice(0, 1))).toEqual({
      a: ["apple", "avocado"],
      b: ["banana"],
    });
  });

  test("戻り値の型が要素の型に合わせて変わる", () => {
    expectTypeOf(groupBy(members(), (m) => m.team)).toEqualTypeOf<Record<string, Member[]>>();
    expectTypeOf(groupBy(words, (w) => w)).toEqualTypeOf<Record<string, string[]>>();
  });
});

describe("countBy", () => {
  test("数える", () => {
    expect(countBy(members(), (m) => m.team)).toEqual({ A: 2, B: 1 });
    expect(countBy([1, 2, 3, 4], (n) => (n % 2 === 0 ? "偶数" : "奇数"))).toEqual({
      奇数: 2,
      偶数: 2,
    });
  });

  test("戻り値の型", () => {
    expectTypeOf(countBy(words, (w) => w)).toEqualTypeOf<Record<string, number>>();
  });
});

describe("partition", () => {
  test("true と false に分ける", () => {
    expect(partition([1, 2, 3, 4], (n) => n > 2)).toEqual([
      [3, 4],
      [1, 2],
    ]);
  });

  test("戻り値の型", () => {
    expectTypeOf(partition(members(), (m) => m.age > 30)).toEqualTypeOf<[Member[], Member[]]>();
  });
});

describe("uniqueBy", () => {
  test("同じキーは最初の1つだけ", () => {
    expect(uniqueBy(members(), (m) => m.team).map((m) => m.name)).toEqual(["山田", "佐藤"]);
    expect(uniqueBy([1, 2, 3, 4], (n) => n % 2)).toEqual([1, 2]);
  });

  test("戻り値の型", () => {
    expectTypeOf(uniqueBy(words, (w) => w.length)).toEqualTypeOf<string[]>();
  });
});

describe("sortBy", () => {
  test("小さい順。同じなら元の順", () => {
    expect(sortBy(members(), (m) => m.age).map((m) => m.name)).toEqual(["佐藤", "山田", "鈴木"]);
    expect(sortBy(words, (w) => w.length)).toEqual(["apple", "banana", "avocado"]);
  });

  test("元の配列は変えない", () => {
    const list = members();
    sortBy(list, (m) => m.age);
    expect(list.map((m) => m.name)).toEqual(["山田", "佐藤", "鈴木"]);
  });

  test("戻り値の型", () => {
    expectTypeOf(sortBy(members(), (m) => m.age)).toEqualTypeOf<Member[]>();
  });
});

describe("chunk", () => {
  test("size 個ずつ", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk(words, 2)).toEqual([["apple", "avocado"], ["banana"]]);
    expect(() => chunk([1], 0)).toThrow(Error);
  });

  test("戻り値の型", () => {
    expectTypeOf(chunk(words, 2)).toEqualTypeOf<string[][]>();
  });
});
