import { describe, expect, expectTypeOf, test } from "vitest";
import { QueryBuilder, Temperature } from "../src/e02-static-getter";

describe("Temperature", () => {
  test("getter と setter", () => {
    const t = new Temperature(100);
    expect(t.celsius).toBe(100);
    expect(t.fahrenheit).toBe(212);
    t.fahrenheit = 32;
    expect(t.celsius).toBe(0);
  });

  test("static メソッドと static フィールド", () => {
    const before = Temperature.created;
    const t = Temperature.fromFahrenheit(212);
    expect(t.celsius).toBe(100);
    expect(Temperature.created).toBe(before + 1);
  });

  test("型", () => {
    expectTypeOf<Temperature["fahrenheit"]>().toEqualTypeOf<number>();
    expectTypeOf<ReturnType<typeof Temperature.fromFahrenheit>>().toEqualTypeOf<Temperature>();
    expectTypeOf(Temperature.created).toEqualTypeOf<number>();
  });
});

describe("QueryBuilder", () => {
  test("メソッドをつなげて組み立てる", () => {
    expect(new QueryBuilder().where("age > 20").where("active").limit(10).build()).toBe(
      "WHERE age > 20 AND active LIMIT 10",
    );
    expect(new QueryBuilder().limit(5).build()).toBe("LIMIT 5");
    expect(new QueryBuilder().build()).toBe("");
  });

  test("where と limit は this を返す", () => {
    const builder = new QueryBuilder();
    expect(builder.where("a")).toBe(builder);
    expect(builder.limit(1)).toBe(builder);
  });
});
