import { describe, expect, expectTypeOf, test } from "vitest";
import { bmiReport, calcBmi } from "../src/q03-type-inference";

describe("calcBmi", () => {
  test("小数第1位までに四捨五入する", () => {
    expect(calcBmi(170, 65)).toBe(22.5);
    expect(calcBmi(160, 45)).toBe(17.6);
    expect(calcBmi(180, 90)).toBe(27.8);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(calcBmi).parameters.toEqualTypeOf<[number, number]>();
    expectTypeOf(calcBmi).returns.toEqualTypeOf<number>();
  });
});

describe("bmiReport", () => {
  test("18.5未満は低体重", () => {
    expect(bmiReport(160, 45)).toBe("BMI 17.6（低体重）");
  });

  test("18.5以上25未満は普通体重", () => {
    expect(bmiReport(200, 74)).toBe("BMI 18.5（普通体重）");
    expect(bmiReport(170, 65)).toBe("BMI 22.5（普通体重）");
  });

  test("25以上は肥満。BMIは小数第1位まで表示する", () => {
    expect(bmiReport(200, 100)).toBe("BMI 25.0（肥満）");
    expect(bmiReport(180, 90)).toBe("BMI 27.8（肥満）");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(bmiReport).parameters.toEqualTypeOf<[number, number]>();
    expectTypeOf(bmiReport).returns.toEqualTypeOf<string>();
  });
});
