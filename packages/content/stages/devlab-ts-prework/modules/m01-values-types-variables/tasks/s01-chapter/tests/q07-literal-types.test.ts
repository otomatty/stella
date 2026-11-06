import { describe, expect, expectTypeOf, test } from "vitest";
import { START_POSITION, move } from "../src/q07-literal-types";

describe("move", () => {
  test('"up" なら1増やし、"down" なら1減らす', () => {
    expect(move(5, "up")).toBe(6);
    expect(move(5, "down")).toBe(4);
  });

  test('direction は "up" と "down" だけを受け付ける', () => {
    expectTypeOf(move).parameters.toEqualTypeOf<[number, "up" | "down"]>();
    expectTypeOf(move).returns.toEqualTypeOf<number>();
    // @ts-expect-error "left" は渡せない
    expectTypeOf(move).toBeCallableWith(5, "left");
  });
});

describe("START_POSITION", () => {
  test("値が 0", () => {
    expect(START_POSITION).toBe(0);
    expect(move(START_POSITION, "up")).toBe(1);
  });

  test("型が 0", () => {
    expectTypeOf<typeof START_POSITION>().toEqualTypeOf<0>();
  });
});
