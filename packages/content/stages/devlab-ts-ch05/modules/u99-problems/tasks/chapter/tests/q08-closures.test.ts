import { describe, expect, expectTypeOf, test } from "vitest";
import { createCounter, makeIdGenerator, makeMultiplier, once } from "../src/q08-closures";

describe("createCounter", () => {
  test("増やす、今の値、元に戻す", () => {
    const counter = createCounter(5);
    expect(counter.increment()).toBe(6);
    expect(counter.increment()).toBe(7);
    expect(counter.current()).toBe(7);
    counter.reset();
    expect(counter.current()).toBe(5);
  });

  test("start を省略すると 0 から", () => {
    expect(createCounter().increment()).toBe(1);
  });

  test("カウンターどうしは値を共有しない", () => {
    const a = createCounter();
    const b = createCounter();
    a.increment();
    expect(b.current()).toBe(0);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(createCounter).parameters.toEqualTypeOf<[number?]>();
    expectTypeOf(createCounter).returns.toEqualTypeOf<{
      increment: () => number;
      reset: () => void;
      current: () => number;
    }>();
  });
});

describe("makeMultiplier", () => {
  test("n 倍する関数を返す", () => {
    const triple = makeMultiplier(3);
    expect(triple(5)).toBe(15);
    expect(makeMultiplier(0.5)(8)).toBe(4);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(makeMultiplier).parameters.toEqualTypeOf<[number]>();
    expectTypeOf(makeMultiplier).returns.toEqualTypeOf<(x: number) => number>();
  });
});

describe("once", () => {
  test("fn は最初の1回だけ呼ばれる", () => {
    let calls = 0;
    const getValue = once(() => {
      calls++;
      return 42;
    });
    expect(getValue()).toBe(42);
    expect(getValue()).toBe(42);
    expect(calls).toBe(1);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(once).parameters.toEqualTypeOf<[() => number]>();
    expectTypeOf(once).returns.toEqualTypeOf<() => number>();
  });
});

describe("makeIdGenerator", () => {
  test("呼ぶたびに番号が増える", () => {
    const nextUserId = makeIdGenerator("user");
    expect(nextUserId()).toBe("user-1");
    expect(nextUserId()).toBe("user-2");
    expect(makeIdGenerator("room")()).toBe("room-1");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(makeIdGenerator).parameters.toEqualTypeOf<[string]>();
    expectTypeOf(makeIdGenerator).returns.toEqualTypeOf<() => string>();
  });
});
