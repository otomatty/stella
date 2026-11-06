import { describe, expect, expectTypeOf, test } from "vitest";
import { type Shape, area, describeShape } from "../src/q04-discriminated-union";

test("Shape の型", () => {
  expectTypeOf<Shape>().toEqualTypeOf<
    | { kind: "circle"; radius: number }
    | { kind: "rect"; width: number; height: number }
    | { kind: "triangle"; base: number; height: number }
  >();
});

describe("area", () => {
  test("図形ごとの面積を返す", () => {
    expect(area({ kind: "circle", radius: 1 })).toBeCloseTo(Math.PI);
    expect(area({ kind: "rect", width: 3, height: 4 })).toBe(12);
    expect(area({ kind: "triangle", base: 3, height: 4 })).toBe(6);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(area).parameters.toEqualTypeOf<[Shape]>();
    expectTypeOf(area).returns.toEqualTypeOf<number>();
    // @ts-expect-error 円に width は書けない
    expectTypeOf(area).toBeCallableWith({ kind: "circle", width: 3 });
  });
});

describe("describeShape", () => {
  test("図形ごとの説明を返す", () => {
    expect(describeShape({ kind: "circle", radius: 2 })).toBe("円（半径 2）");
    expect(describeShape({ kind: "rect", width: 3, height: 4 })).toBe("長方形（3 × 4）");
    expect(describeShape({ kind: "triangle", base: 3, height: 4 })).toBe(
      "三角形（底辺 3・高さ 4）",
    );
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(describeShape).parameters.toEqualTypeOf<[Shape]>();
    expectTypeOf(describeShape).returns.toEqualTypeOf<string>();
  });
});
