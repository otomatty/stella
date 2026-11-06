import { describe, expect, expectTypeOf, test } from "vitest";
import { type NumberFn, compose, pipe, repeatFn } from "../src/e02-function-types";

test("NumberFn の型", () => {
  expectTypeOf<NumberFn>().toEqualTypeOf<(x: number) => number>();
});

describe("compose", () => {
  test("f の後に g を当てはめる", () => {
    const addThenDouble = compose(
      (x) => x + 1,
      (x) => x * 2,
    );
    expect(addThenDouble(3)).toBe(8);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(compose).parameters.toEqualTypeOf<[NumberFn, NumberFn]>();
    expectTypeOf(compose).returns.toEqualTypeOf<NumberFn>();
  });
});

describe("pipe", () => {
  test("前から順に当てはめる", () => {
    expect(
      pipe(
        (x) => x + 1,
        (x) => x * 10,
      )(2),
    ).toBe(30);
    expect(pipe()(7)).toBe(7);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(pipe).parameters.toEqualTypeOf<NumberFn[]>();
    expectTypeOf(pipe).returns.toEqualTypeOf<NumberFn>();
  });
});

describe("repeatFn", () => {
  test("times 回当てはめる", () => {
    expect(repeatFn((x) => x * 2, 3)(1)).toBe(8);
    expect(repeatFn((x) => x * 2, 0)(5)).toBe(5);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(repeatFn).parameters.toEqualTypeOf<[NumberFn, number]>();
    expectTypeOf(repeatFn).returns.toEqualTypeOf<NumberFn>();
  });
});
