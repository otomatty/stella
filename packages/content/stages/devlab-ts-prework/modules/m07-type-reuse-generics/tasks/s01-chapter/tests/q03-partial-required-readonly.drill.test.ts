// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  type PartialOptions,
  type RequiredProfile,
  type ReadonlyOptions,
  type ReadonlyProfile,
  type Options,
  withDefaults,
  patchOptions,
  type Profile,
  completeProfile,
  freezeOptions,
  isComplete,
  countSet,
  mergePatches,
  updateEmail,
  requireEmail,
  diffOptions,
  toggleBold,
  sizeOr,
  describeOptions,
  fillProfile,
  emptyPatch,
  resetKeys,
} from "../src/q03-partial-required-readonly.drill";

test("問1 PartialOptions", () => {
  expectTypeOf<PartialOptions>().toEqualTypeOf<{ size?: number; color?: string; bold?: boolean }>();
});

test("問2 RequiredProfile", () => {
  expectTypeOf<RequiredProfile>().toEqualTypeOf<{ name: string; email: string; age: number }>();
});

test("問3 ReadonlyOptions", () => {
  expectTypeOf<ReadonlyOptions>().toEqualTypeOf<{
    readonly size: number;
    readonly color: string;
    readonly bold: boolean;
  }>();
});

test("問4 ReadonlyProfile", () => {
  expectTypeOf<ReadonlyProfile>().toEqualTypeOf<{
    readonly name: string;
    readonly email?: string;
    readonly age?: number;
  }>();
});

test("問5 withDefaults", () => {
  expect(withDefaults({ size: 20 })).toEqual({ size: 20, color: "black", bold: false });
  expect(withDefaults({})).toEqual({ size: 12, color: "black", bold: false });
  expectTypeOf(withDefaults).parameters.toEqualTypeOf<[Partial<Options>]>();
  expectTypeOf(withDefaults).returns.toEqualTypeOf<Options>();
});

test("問6 patchOptions", () => {
  const options: Options = { size: 12, color: "red", bold: false };
  expect(patchOptions(options, { bold: true })).toEqual({ size: 12, color: "red", bold: true });
  expect(options.bold).toBe(false);
  expectTypeOf(patchOptions).parameters.toEqualTypeOf<[Options, Partial<Options>]>();
  expectTypeOf(patchOptions).returns.toEqualTypeOf<Options>();
});

test("問7 completeProfile", () => {
  expect(completeProfile({ name: "山田" })).toEqual({ name: "山田", email: "", age: 0 });
  expect(completeProfile({ name: "山田", email: "y@example.com", age: 30 })).toEqual({
    name: "山田",
    email: "y@example.com",
    age: 30,
  });
  expectTypeOf(completeProfile).parameters.toEqualTypeOf<[Profile]>();
  expectTypeOf(completeProfile).returns.toEqualTypeOf<Required<Profile>>();
});

test("問8 freezeOptions", () => {
  const frozen = freezeOptions({ size: 12, color: "red", bold: false });
  expect(Object.isFrozen(frozen)).toBe(true);
  expect(() => {
    // @ts-expect-error 読み取り専用なので代入できない
    frozen.size = 1;
  }).toThrow(TypeError);
  expectTypeOf(freezeOptions).parameters.toEqualTypeOf<[Options]>();
  expectTypeOf(freezeOptions).returns.toEqualTypeOf<Readonly<Options>>();
});

test("問9 isComplete", () => {
  expect(isComplete({ name: "山田" })).toBe(false);
  expect(isComplete({ name: "山田", email: "y@example.com", age: 30 })).toBe(true);
  expectTypeOf(isComplete).guards.toEqualTypeOf<Required<Profile>>();
});

test("問10 countSet", () => {
  expect(countSet({ size: 1, bold: false })).toBe(2);
  expect(countSet({})).toBe(0);
  expectTypeOf(countSet).parameters.toEqualTypeOf<[Partial<Options>]>();
  expectTypeOf(countSet).returns.toEqualTypeOf<number>();
});

test("問11 mergePatches", () => {
  expect(mergePatches({ size: 1 }, { size: 2, bold: true })).toEqual({ size: 2, bold: true });
  expect(mergePatches()).toEqual({});
  expectTypeOf(mergePatches).parameters.toEqualTypeOf<Partial<Options>[]>();
  expectTypeOf(mergePatches).returns.toEqualTypeOf<Partial<Options>>();
});

test("問12 updateEmail", () => {
  const profile: Readonly<Profile> = { name: "山田" };
  expect(updateEmail(profile, "new@example.com")).toEqual({
    name: "山田",
    email: "new@example.com",
  });
  expect(profile.email).toBeUndefined();
  expectTypeOf(updateEmail).parameters.toEqualTypeOf<[Readonly<Profile>, string]>();
  expectTypeOf(updateEmail).returns.toEqualTypeOf<Readonly<Profile>>();
});

test("問13 requireEmail", () => {
  expect(requireEmail({ name: "山田", email: "y@example.com" })).toBe("y@example.com");
  expect(() => requireEmail({ name: "山田" })).toThrow("email がありません");
  expectTypeOf(requireEmail).parameters.toEqualTypeOf<[Profile]>();
  expectTypeOf(requireEmail).returns.toEqualTypeOf<string>();
});

test("問14 diffOptions", () => {
  const a: Options = { size: 12, color: "black", bold: false };
  expect(diffOptions(a, { ...a, size: 20 })).toEqual({ size: 20 });
  expect(diffOptions(a, a)).toEqual({});
  expectTypeOf(diffOptions).parameters.toEqualTypeOf<[Options, Options]>();
  expectTypeOf(diffOptions).returns.toEqualTypeOf<Partial<Options>>();
});

test("問15 toggleBold", () => {
  expect(toggleBold({ size: 12, color: "black", bold: false }).bold).toBe(true);
  expectTypeOf(toggleBold).parameters.toEqualTypeOf<[Readonly<Options>]>();
  expectTypeOf(toggleBold).returns.toEqualTypeOf<Options>();
});

test("問16 sizeOr", () => {
  expect(sizeOr({}, 16)).toBe(16);
  expect(sizeOr({ size: 10 }, 16)).toBe(10);
  expectTypeOf(sizeOr).parameters.toEqualTypeOf<[Partial<Options>, number]>();
  expectTypeOf(sizeOr).returns.toEqualTypeOf<number>();
});

test("問17 describeOptions", () => {
  expect(describeOptions({ size: 12, color: "black", bold: true })).toBe("12px black 太字");
  expect(describeOptions({ size: 10, color: "red", bold: false })).toBe("10px red");
  expectTypeOf(describeOptions).parameters.toEqualTypeOf<[Readonly<Options>]>();
  expectTypeOf(describeOptions).returns.toEqualTypeOf<string>();
});

test("問18 fillProfile", () => {
  expect(fillProfile({ name: "山田" }, { name: "", email: "-", age: 0 })).toEqual({
    name: "山田",
    email: "-",
    age: 0,
  });
  expectTypeOf(fillProfile).parameters.toEqualTypeOf<[Profile, Required<Profile>]>();
  expectTypeOf(fillProfile).returns.toEqualTypeOf<Required<Profile>>();
});

test("問19 emptyPatch", () => {
  expect(emptyPatch()).toEqual({});
  expectTypeOf(emptyPatch).parameters.toEqualTypeOf<[]>();
  expectTypeOf(emptyPatch).returns.toEqualTypeOf<Partial<Options>>();
});

test("問20 resetKeys", () => {
  expect(resetKeys({ size: 20, color: "red", bold: true }, ["size"])).toEqual({
    size: 12,
    color: "red",
    bold: true,
  });
  expect(resetKeys({ size: 20, color: "red", bold: true }, ["color", "bold"])).toEqual({
    size: 20,
    color: "black",
    bold: false,
  });
  expectTypeOf(resetKeys).parameters.toEqualTypeOf<
    [Options, readonly ("size" | "color" | "bold")[]]
  >();
  expectTypeOf(resetKeys).returns.toEqualTypeOf<Options>();
});
