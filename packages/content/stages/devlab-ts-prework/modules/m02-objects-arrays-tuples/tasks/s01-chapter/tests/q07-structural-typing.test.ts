import { describe, expect, expectTypeOf, test } from "vitest";
import {
  type Banner,
  type Photo,
  type Rect,
  type Size,
  area,
  isLandscape,
  totalArea,
} from "../src/q07-structural-typing";

const rect: Rect = { width: 3, height: 4 };
const photo: Photo = { url: "team.png", width: 1920, height: 1080 };
const banner: Banner = { text: "募集中", color: "red", width: 300, height: 600 };

test("Size の型", () => {
  expectTypeOf<Size>().toEqualTypeOf<{ width: number; height: number }>();
});

describe("area", () => {
  test("Rect、Photo、Banner のどれでも面積を返す", () => {
    expect(area(rect)).toBe(12);
    expect(area(photo)).toBe(2073600);
    expect(area(banner)).toBe(180000);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(area).parameters.toEqualTypeOf<[Size]>();
    expectTypeOf(area).returns.toEqualTypeOf<number>();
  });
});

describe("totalArea", () => {
  test("違う型が混ざった配列でも合計を返す", () => {
    expect(totalArea([rect, photo, banner])).toBe(12 + 2073600 + 180000);
    expect(totalArea([])).toBe(0);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(totalArea).parameters.toEqualTypeOf<[readonly Size[]]>();
    expectTypeOf(totalArea).returns.toEqualTypeOf<number>();
  });
});

describe("isLandscape", () => {
  test("width が height より大きければ true", () => {
    expect(isLandscape(photo)).toBe(true);
    expect(isLandscape(banner)).toBe(false);
    expect(isLandscape({ width: 5, height: 5 })).toBe(false);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(isLandscape).parameters.toEqualTypeOf<[Size]>();
    expectTypeOf(isLandscape).returns.toEqualTypeOf<boolean>();
  });
});
