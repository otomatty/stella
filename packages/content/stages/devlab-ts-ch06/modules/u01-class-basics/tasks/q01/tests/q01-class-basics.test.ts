import { describe, expect, expectTypeOf, test } from "vitest";
import { Counter, Temperature } from "../src/q01-class-basics";

describe("Counter", () => {
  test("増やす、減らす、戻す", () => {
    const counter = new Counter(5);
    expect(counter.count).toBe(5);
    expect(counter.increment()).toBe(6);
    expect(counter.decrement()).toBe(5);
    counter.increment();
    counter.reset();
    expect(counter.count).toBe(5);
  });

  test("start を省略すると 0。0 より小さくならない", () => {
    const counter = new Counter();
    expect(counter.decrement()).toBe(0);
    expect(counter.increment()).toBe(1);
  });

  test("型", () => {
    expectTypeOf(Counter).constructorParameters.toEqualTypeOf<[start?: number]>();
    expectTypeOf<Counter["count"]>().toEqualTypeOf<number>();
    expectTypeOf<Counter["increment"]>().toEqualTypeOf<() => number>();
    expectTypeOf<Counter["decrement"]>().toEqualTypeOf<() => number>();
    expectTypeOf<Counter["reset"]>().toEqualTypeOf<() => void>();
  });
});

describe("Temperature", () => {
  test("華氏、氷点下、表示", () => {
    const hot = new Temperature(25);
    expect(hot.celsius).toBe(25);
    expect(hot.toFahrenheit()).toBe(77);
    expect(hot.isFreezing()).toBe(false);
    expect(hot.label()).toBe("25℃");
    expect(new Temperature(0).isFreezing()).toBe(true);
  });

  test("型", () => {
    expectTypeOf(Temperature).constructorParameters.toEqualTypeOf<[celsius: number]>();
    expectTypeOf<Temperature["celsius"]>().toEqualTypeOf<number>();
    expectTypeOf<Temperature["toFahrenheit"]>().toEqualTypeOf<() => number>();
    expectTypeOf<Temperature["isFreezing"]>().toEqualTypeOf<() => boolean>();
    expectTypeOf<Temperature["label"]>().toEqualTypeOf<() => string>();
  });
});
