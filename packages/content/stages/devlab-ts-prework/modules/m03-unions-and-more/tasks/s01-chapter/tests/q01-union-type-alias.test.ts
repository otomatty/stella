import { describe, expect, expectTypeOf, test } from "vitest";
import { type Id, joinIds, normalizeId } from "../src/q01-union-type-alias";

test("Id の型", () => {
  expectTypeOf<Id>().toEqualTypeOf<string | number>();
});

describe("normalizeId", () => {
  test("数値は6桁になるように0で埋める", () => {
    expect(normalizeId(42)).toBe("000042");
    expect(normalizeId(123456)).toBe("123456");
  });

  test("文字列は前後の空白を取り除いて大文字にする", () => {
    expect(normalizeId(" ab-01 ")).toBe("AB-01");
    expect(normalizeId("Z9")).toBe("Z9");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(normalizeId).parameters.toEqualTypeOf<[Id]>();
    expectTypeOf(normalizeId).returns.toEqualTypeOf<string>();
    // @ts-expect-error Id に真偽値は渡せない
    expectTypeOf(normalizeId).toBeCallableWith(true);
  });
});

describe("joinIds", () => {
  test("整えてから , でつなぐ", () => {
    expect(joinIds([7, "x-9"])).toBe("000007, X-9");
    expect(joinIds([])).toBe("");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(joinIds).parameters.toEqualTypeOf<[readonly Id[]]>();
    expectTypeOf(joinIds).returns.toEqualTypeOf<string>();
  });
});
