// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  getProp,
  shortest,
  longer,
  pluckAll,
  mergeObjects,
  addId,
  setProp,
  maxBy,
  sumBy,
  sortByName,
  oldest,
  sortByNumber,
  findById,
  updateById,
  countWhere,
  orDefault,
  hasAllKeys,
  firstWhere,
  countByKey,
  toIdMap,
} from "../src/q07-constraints.drill";

test("問1 getProp", () => {
  const user = { name: "山田", age: 30 };
  expect(getProp(user, "age")).toBe(30);
  expectTypeOf(getProp(user, "age")).toEqualTypeOf<number>();
  expectTypeOf(getProp(user, "name")).toEqualTypeOf<string>();
  const call = () => {
    // @ts-expect-error email は user のプロパティではない
    getProp(user, "email");
  };
  expect(typeof call).toBe("function");
});

test("問2 shortest", () => {
  const words: string[] = ["abc", "a", "ab"];
  expect(shortest(words)).toBe("a");
  expect(shortest([[1, 2], [3]])).toEqual([3]);
  expectTypeOf(shortest(words)).toEqualTypeOf<string | undefined>();
  const call = () => {
    // @ts-expect-error 数値には length がない
    shortest([1, 2]);
  };
  expect(typeof call).toBe("function");
});

test("問3 longer", () => {
  const nums: number[] = [1, 2];
  expect(longer(nums, [3])).toEqual([1, 2]);
  expect(longer("ab", "cde")).toBe("cde");
  expectTypeOf(longer(nums, nums)).toEqualTypeOf<number[]>();
});

test("問4 pluckAll", () => {
  const users = [{ name: "山田", age: 30 }];
  expect(pluckAll(users, "name")).toEqual(["山田"]);
  expectTypeOf(pluckAll(users, "age")).toEqualTypeOf<number[]>();
});

test("問5 mergeObjects", () => {
  expect(mergeObjects({ a: 1 }, { b: "x" })).toEqual({ a: 1, b: "x" });
  expectTypeOf(mergeObjects({ a: 1 }, { b: "x" })).toEqualTypeOf<{ a: number } & { b: string }>();
  const call = () => {
    // @ts-expect-error 数値はオブジェクトではない
    mergeObjects(1, { b: "x" });
  };
  expect(typeof call).toBe("function");
});

test("問6 addId", () => {
  expect(addId({ name: "山田" }, 1)).toEqual({ name: "山田", id: 1 });
  expectTypeOf(addId({ name: "山田" }, 1)).toEqualTypeOf<{ name: string } & { id: number }>();
});

test("問7 setProp", () => {
  const user = { name: "山田", age: 30 };
  expect(setProp(user, "age", 31)).toEqual({ name: "山田", age: 31 });
  expect(user.age).toBe(30);
  const call = () => {
    // @ts-expect-error age に文字列は入れられない
    setProp(user, "age", "31");
  };
  expect(typeof call).toBe("function");
});

test("問8 maxBy", () => {
  const words: string[] = ["a", "abc", "ab"];
  expect(maxBy(words, (s) => s.length)).toBe("abc");
  expectTypeOf(maxBy(words, (s) => s.length)).toEqualTypeOf<string | undefined>();
});

test("問9 sumBy", () => {
  expect(sumBy([{ price: 100 }, { price: 50 }], (x) => x.price)).toBe(150);
  expect(sumBy(["ab", "c"], (s) => s.length)).toBe(3);
});

test("問10 sortByName", () => {
  const rows = [
    { name: "b", age: 1 },
    { name: "a", age: 2 },
  ];
  expect(sortByName(rows).map((r) => r.name)).toEqual(["a", "b"]);
  expectTypeOf(sortByName(rows)).toEqualTypeOf<{ name: string; age: number }[]>();
  const call = () => {
    // @ts-expect-error name を持たない要素は渡せない
    sortByName([{ title: "x" }]);
  };
  expect(typeof call).toBe("function");
});

test("問11 oldest", () => {
  const people = [
    { name: "a", age: 30 },
    { name: "b", age: 41 },
  ];
  expect(oldest(people)).toEqual({ name: "b", age: 41 });
  expectTypeOf(oldest(people)).toEqualTypeOf<{ name: string; age: number } | undefined>();
});

test("問12 sortByNumber", () => {
  const words: string[] = ["ccc", "a", "bb"];
  expect(sortByNumber(words, (s) => s.length)).toEqual(["a", "bb", "ccc"]);
  expectTypeOf(sortByNumber(words, (s) => s.length)).toEqualTypeOf<string[]>();
});

test("問13 findById", () => {
  const rows = [
    { id: 1, name: "a" },
    { id: 2, name: "b" },
  ];
  expect(findById(rows, 2)).toEqual({ id: 2, name: "b" });
  expect(findById(rows, 3)).toBeUndefined();
  expectTypeOf(findById(rows, 2)).toEqualTypeOf<{ id: number; name: string } | undefined>();
});

test("問14 updateById", () => {
  const rows = [
    { id: 1, name: "a" },
    { id: 2, name: "b" },
  ];
  expect(updateById(rows, 1, { name: "z" })).toEqual([
    { id: 1, name: "z" },
    { id: 2, name: "b" },
  ]);
  expect(rows[0]?.name).toBe("a");
});

test("問15 countWhere", () => {
  expect(countWhere([1, 2, 3], (n) => n > 1)).toBe(2);
  expect(countWhere(["a", "bb"], (s) => s.length === 2)).toBe(1);
});

test("問16 orDefault", () => {
  const nums: number[] = [5];
  expect(orDefault(undefined, 5)).toBe(5);
  expect(orDefault("a", "b")).toBe("a");
  expectTypeOf(orDefault(undefined, nums.length)).toEqualTypeOf<number>();
  const call = () => {
    // @ts-expect-error orDefault に真偽値は渡せない
    orDefault(undefined, true);
  };
  expect(typeof call).toBe("function");
});

test("問17 hasAllKeys", () => {
  const value: { a: number; b?: string } = { a: 1 };
  expect(hasAllKeys(value, ["a"])).toBe(true);
  expect(hasAllKeys(value, ["a", "b"])).toBe(false);
  const call = () => {
    // @ts-expect-error c は value のプロパティではない
    hasAllKeys(value, ["c"]);
  };
  expect(typeof call).toBe("function");
});

test("問18 firstWhere", () => {
  const nums: number[] = [1, 4, 6];
  expect(firstWhere(nums, (n) => n % 2 === 0)).toBe(4);
  expectTypeOf(firstWhere(nums, (n) => n > 0)).toEqualTypeOf<number | undefined>();
});

test("問19 countByKey", () => {
  expect(countByKey(["apple", "avocado", "banana"], (w) => w.slice(0, 1))).toEqual({ a: 2, b: 1 });
  const result = countByKey([1, 2, 3], (n): "odd" | "even" => (n % 2 === 0 ? "even" : "odd"));
  expect(result).toEqual({ odd: 2, even: 1 });
  expectTypeOf(result).toEqualTypeOf<Partial<Record<"odd" | "even", number>>>();
});

test("問20 toIdMap", () => {
  const rows = [
    { id: 1, name: "a" },
    { id: 2, name: "b" },
  ];
  expect(toIdMap(rows)).toEqual({ 1: { id: 1, name: "a" }, 2: { id: 2, name: "b" } });
  expectTypeOf(toIdMap(rows)).toEqualTypeOf<Record<number, { id: number; name: string }>>();
});
