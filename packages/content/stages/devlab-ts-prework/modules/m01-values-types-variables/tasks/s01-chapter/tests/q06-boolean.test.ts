import { describe, expect, expectTypeOf, test } from "vitest";
import { canEnter, hasText, isLeapYear } from "../src/q06-boolean";

describe("isLeapYear", () => {
  test("4で割り切れる年はうるう年", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2023)).toBe(false);
  });

  test("100で割り切れる年はうるう年ではない", () => {
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2100)).toBe(false);
  });

  test("400で割り切れる年はうるう年", () => {
    expect(isLeapYear(2000)).toBe(true);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(isLeapYear).parameters.toEqualTypeOf<[number]>();
    expectTypeOf(isLeapYear).returns.toEqualTypeOf<boolean>();
  });
});

describe("hasText", () => {
  test("空白以外の文字があれば true", () => {
    expect(hasText("  a ")).toBe(true);
    expect(hasText("Agora")).toBe(true);
  });

  test("空文字や空白だけなら false", () => {
    expect(hasText("")).toBe(false);
    expect(hasText("   ")).toBe(false);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(hasText).parameters.toEqualTypeOf<[string]>();
    expectTypeOf(hasText).returns.toEqualTypeOf<boolean>();
  });
});

describe("canEnter", () => {
  test("スタッフは、いつでも入れる", () => {
    expect(canEnter(10, false, true)).toBe(true);
  });

  test("チケットを持っていて12歳以上なら入れる", () => {
    expect(canEnter(12, true, false)).toBe(true);
    expect(canEnter(30, true, false)).toBe(true);
  });

  test("チケットがない、または12歳未満なら入れない", () => {
    expect(canEnter(30, false, false)).toBe(false);
    expect(canEnter(11, true, false)).toBe(false);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(canEnter).parameters.toEqualTypeOf<[number, boolean, boolean]>();
    expectTypeOf(canEnter).returns.toEqualTypeOf<boolean>();
  });
});
