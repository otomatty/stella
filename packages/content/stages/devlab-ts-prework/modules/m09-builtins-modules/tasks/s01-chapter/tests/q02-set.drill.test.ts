// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  toSet,
  uniqueCount,
  hasDuplicates,
  uniqueSorted,
  uniqueChars,
  withAdded,
  withRemoved,
  toggle,
  union,
  intersection,
  difference,
  symmetricDifference,
  isSubset,
  hasAll,
  hasAny,
  commonChars,
  firstRepeated,
  uniqueById,
  type User,
  allTags,
  sameMembers,
} from "../src/q02-set.drill";

test("問1 toSet", () => {
  expect([...toSet(["a", "b", "a"])]).toEqual(["a", "b"]);
  expectTypeOf(toSet).parameters.toEqualTypeOf<[string[]]>();
  expectTypeOf(toSet).returns.toEqualTypeOf<Set<string>>();
});

test("問2 uniqueCount", () => {
  expect(uniqueCount(["a", "b", "a"])).toBe(2);
  expect(uniqueCount([])).toBe(0);
  expectTypeOf(uniqueCount).parameters.toEqualTypeOf<[string[]]>();
  expectTypeOf(uniqueCount).returns.toEqualTypeOf<number>();
});

test("問3 hasDuplicates", () => {
  expect(hasDuplicates([1, 2, 1])).toBe(true);
  expect(hasDuplicates([1, 2, 3])).toBe(false);
  expectTypeOf(hasDuplicates).parameters.toEqualTypeOf<[number[]]>();
  expectTypeOf(hasDuplicates).returns.toEqualTypeOf<boolean>();
});

test("問4 uniqueSorted", () => {
  const items = [3, 1, 10, 3, 2];
  expect(uniqueSorted(items)).toEqual([1, 2, 3, 10]);
  expect(items).toEqual([3, 1, 10, 3, 2]);
  expectTypeOf(uniqueSorted).parameters.toEqualTypeOf<[number[]]>();
  expectTypeOf(uniqueSorted).returns.toEqualTypeOf<number[]>();
});

test("問5 uniqueChars", () => {
  expect(uniqueChars("banana")).toBe("ban");
  expect(uniqueChars("")).toBe("");
  expectTypeOf(uniqueChars).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(uniqueChars).returns.toEqualTypeOf<string>();
});

test("問6 withAdded", () => {
  const set = new Set(["a"]);
  expect([...withAdded(set, "b")]).toEqual(["a", "b"]);
  expect([...withAdded(set, "a")]).toEqual(["a"]);
  expect(set.size).toBe(1);
  expectTypeOf(withAdded).parameters.toEqualTypeOf<[Set<string>, string]>();
  expectTypeOf(withAdded).returns.toEqualTypeOf<Set<string>>();
});

test("問7 withRemoved", () => {
  const set = new Set(["a", "b"]);
  expect([...withRemoved(set, "a")]).toEqual(["b"]);
  expect(set.size).toBe(2);
  expectTypeOf(withRemoved).parameters.toEqualTypeOf<[Set<string>, string]>();
  expectTypeOf(withRemoved).returns.toEqualTypeOf<Set<string>>();
});

test("問8 toggle", () => {
  const set = new Set(["a"]);
  expect(toggle(set, "a").size).toBe(0);
  expect([...toggle(set, "b")]).toEqual(["a", "b"]);
  expect(set.size).toBe(1);
  expectTypeOf(toggle).parameters.toEqualTypeOf<[Set<string>, string]>();
  expectTypeOf(toggle).returns.toEqualTypeOf<Set<string>>();
});

test("問9 union", () => {
  expect([...union(new Set([1, 2]), new Set([3, 2]))]).toEqual([1, 2, 3]);
  expectTypeOf(union).parameters.toEqualTypeOf<[Set<number>, Set<number>]>();
  expectTypeOf(union).returns.toEqualTypeOf<Set<number>>();
});

test("問10 intersection", () => {
  expect([...intersection(new Set([1, 2, 3]), new Set([3, 1]))]).toEqual([1, 3]);
  expect(intersection(new Set([1]), new Set([2])).size).toBe(0);
  expectTypeOf(intersection).parameters.toEqualTypeOf<[Set<number>, Set<number>]>();
  expectTypeOf(intersection).returns.toEqualTypeOf<Set<number>>();
});

test("問11 difference", () => {
  expect([...difference(new Set([1, 2, 3]), new Set([2, 4]))]).toEqual([1, 3]);
  expectTypeOf(difference).parameters.toEqualTypeOf<[Set<number>, Set<number>]>();
  expectTypeOf(difference).returns.toEqualTypeOf<Set<number>>();
});

test("問12 symmetricDifference", () => {
  expect([...symmetricDifference(new Set([1, 2, 5]), new Set([2, 3]))]).toEqual([1, 5, 3]);
  expectTypeOf(symmetricDifference).parameters.toEqualTypeOf<[Set<number>, Set<number>]>();
  expectTypeOf(symmetricDifference).returns.toEqualTypeOf<Set<number>>();
});

test("問13 isSubset", () => {
  expect(isSubset(new Set([1, 2]), new Set([1, 2, 3]))).toBe(true);
  expect(isSubset(new Set([1, 4]), new Set([1, 2, 3]))).toBe(false);
  expect(isSubset(new Set(), new Set([1]))).toBe(true);
  expectTypeOf(isSubset).parameters.toEqualTypeOf<[Set<number>, Set<number>]>();
  expectTypeOf(isSubset).returns.toEqualTypeOf<boolean>();
});

test("問14 hasAll", () => {
  const permissions = new Set(["read", "write"]);
  expect(hasAll(permissions, ["read", "write"])).toBe(true);
  expect(hasAll(permissions, ["read", "delete"])).toBe(false);
  expect(hasAll(permissions, [])).toBe(true);
  expectTypeOf(hasAll).parameters.toEqualTypeOf<[Set<string>, string[]]>();
  expectTypeOf(hasAll).returns.toEqualTypeOf<boolean>();
});

test("問15 hasAny", () => {
  const permissions = new Set(["read"]);
  expect(hasAny(permissions, ["write", "read"])).toBe(true);
  expect(hasAny(permissions, ["write"])).toBe(false);
  expectTypeOf(hasAny).parameters.toEqualTypeOf<[Set<string>, string[]]>();
  expectTypeOf(hasAny).returns.toEqualTypeOf<boolean>();
});

test("問16 commonChars", () => {
  expect(commonChars("banana", "cabin")).toBe("ban");
  expect(commonChars("abc", "xyz")).toBe("");
  expectTypeOf(commonChars).parameters.toEqualTypeOf<[string, string]>();
  expectTypeOf(commonChars).returns.toEqualTypeOf<string>();
});

test("問17 firstRepeated", () => {
  expect(firstRepeated(["a", "b", "c", "b", "a"])).toBe("b");
  expect(firstRepeated(["a", "b"])).toBeUndefined();
  expectTypeOf(firstRepeated).parameters.toEqualTypeOf<[string[]]>();
  expectTypeOf(firstRepeated).returns.toEqualTypeOf<string | undefined>();
});

test("問18 uniqueById", () => {
  const users: User[] = [
    { id: 1, name: "山田" },
    { id: 2, name: "佐藤" },
    { id: 1, name: "山田（重複）" },
  ];
  expect(uniqueById(users).map((u) => u.name)).toEqual(["山田", "佐藤"]);
  expectTypeOf(uniqueById).parameters.toEqualTypeOf<[User[]]>();
  expectTypeOf(uniqueById).returns.toEqualTypeOf<User[]>();
});

test("問19 allTags", () => {
  expect(allTags([{ tags: ["ts", "js"] }, { tags: ["js", "css"] }, { tags: [] }])).toEqual([
    "ts",
    "js",
    "css",
  ]);
  expectTypeOf(allTags).parameters.toEqualTypeOf<[{ tags: string[] }[]]>();
  expectTypeOf(allTags).returns.toEqualTypeOf<string[]>();
});

test("問20 sameMembers", () => {
  expect(sameMembers(["a", "b", "a"], ["b", "a"])).toBe(true);
  expect(sameMembers(["a", "b"], ["a", "c"])).toBe(false);
  expect(sameMembers(["a"], ["a", "b"])).toBe(false);
  expectTypeOf(sameMembers).parameters.toEqualTypeOf<[string[], string[]]>();
  expectTypeOf(sameMembers).returns.toEqualTypeOf<boolean>();
});
