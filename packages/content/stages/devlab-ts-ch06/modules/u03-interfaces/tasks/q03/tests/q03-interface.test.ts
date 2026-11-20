import { describe, expect, expectTypeOf, test } from "vitest";
import { Circle, Rectangle, type Shape, largest, totalArea } from "../src/q03-interface";

describe("Shape", () => {
  test("Shape の形", () => {
    const square: Shape = { name: "正方形", area: () => 4, perimeter: () => 8 };
    expect(square.area()).toBe(4);
    // @ts-expect-error name は読み取り専用
    square.name = "四角";
  });

  test("Circle と Rectangle は Shape として扱える", () => {
    const shapes: Shape[] = [new Circle(1), new Rectangle(2, 3)];
    expect(shapes.map((s) => s.name)).toEqual(["円", "長方形"]);
  });
});

describe("Circle", () => {
  test("面積と周りの長さ", () => {
    const circle = new Circle(2);
    expect(circle.area()).toBeCloseTo(4 * Math.PI);
    expect(circle.perimeter()).toBeCloseTo(4 * Math.PI);
  });

  test("型", () => {
    expectTypeOf(Circle).constructorParameters.toEqualTypeOf<[radius: number]>();
  });
});

describe("Rectangle", () => {
  test("面積と周りの長さ", () => {
    const rect = new Rectangle(2, 3);
    expect(rect.area()).toBe(6);
    expect(rect.perimeter()).toBe(10);
  });

  test("型", () => {
    expectTypeOf(Rectangle).constructorParameters.toEqualTypeOf<[width: number, height: number]>();
  });
});

describe("totalArea", () => {
  test("面積の合計", () => {
    expect(totalArea([new Rectangle(2, 3), new Rectangle(1, 1)])).toBe(7);
    expect(totalArea([])).toBe(0);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(totalArea).parameters.toEqualTypeOf<[readonly Shape[]]>();
    expectTypeOf(totalArea).returns.toEqualTypeOf<number>();
  });
});

describe("largest", () => {
  test("面積がいちばん大きい図形", () => {
    const small = new Rectangle(1, 1);
    const big = new Circle(2);
    expect(largest([small, big])).toBe(big);
    expect(largest([])).toBeUndefined();
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(largest).parameters.toEqualTypeOf<[readonly Shape[]]>();
    expectTypeOf(largest).returns.toEqualTypeOf<Shape | undefined>();
  });
});
