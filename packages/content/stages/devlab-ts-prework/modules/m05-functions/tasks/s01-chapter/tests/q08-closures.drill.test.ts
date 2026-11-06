// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  makeAdder,
  makeTimes,
  makeGreeter,
  makeCounter,
  makeCounterFrom,
  makeToggle,
  makeAccumulator,
  makeIdMaker,
  onlyOnce,
  makeLimiter,
  makeHistory,
  makeStack,
  makeSquareCache,
  makeCycler,
  makeWallet,
  makeFormatter,
  makeValidator,
  makeLapTimer,
  partial,
  makeTagger,
} from "../src/q08-closures.drill";

test("問1 makeAdder", () => {
  const add3 = makeAdder(3);
  expect(add3(4)).toBe(7);
  expect(add3(10)).toBe(13);
  expectTypeOf(makeAdder).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(makeAdder).returns.toEqualTypeOf<(x: number) => number>();
});

test("問2 makeTimes", () => {
  expect(makeTimes(2)(5)).toBe(10);
  expectTypeOf(makeTimes).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(makeTimes).returns.toEqualTypeOf<(x: number) => number>();
});

test("問3 makeGreeter", () => {
  expect(makeGreeter("おはよう")("山田")).toBe("おはよう、山田さん");
  expectTypeOf(makeGreeter).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(makeGreeter).returns.toEqualTypeOf<(name: string) => string>();
});

test("問4 makeCounter", () => {
  const next = makeCounter();
  expect(next()).toBe(1);
  expect(next()).toBe(2);
  expect(makeCounter()()).toBe(1);
  expectTypeOf(makeCounter).parameters.toEqualTypeOf<[]>();
  expectTypeOf(makeCounter).returns.toEqualTypeOf<() => number>();
});

test("問5 makeCounterFrom", () => {
  const next = makeCounterFrom(10);
  expect(next()).toBe(10);
  expect(next()).toBe(11);
  expectTypeOf(makeCounterFrom).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(makeCounterFrom).returns.toEqualTypeOf<() => number>();
});

test("問6 makeToggle", () => {
  const toggle = makeToggle(false);
  expect(toggle()).toBe(true);
  expect(toggle()).toBe(false);
  expectTypeOf(makeToggle).parameters.toEqualTypeOf<[boolean]>();
  expectTypeOf(makeToggle).returns.toEqualTypeOf<() => boolean>();
});

test("問7 makeAccumulator", () => {
  const add = makeAccumulator();
  expect(add(5)).toBe(5);
  expect(add(3)).toBe(8);
  expectTypeOf(makeAccumulator).parameters.toEqualTypeOf<[]>();
  expectTypeOf(makeAccumulator).returns.toEqualTypeOf<(n: number) => number>();
});

test("問8 makeIdMaker", () => {
  const nextId = makeIdMaker("u");
  expect(nextId()).toBe("u1");
  expect(nextId()).toBe("u2");
  expectTypeOf(makeIdMaker).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(makeIdMaker).returns.toEqualTypeOf<() => string>();
});

test("問9 onlyOnce", () => {
  let calls = 0;
  const get = onlyOnce(() => {
    calls++;
    return 42;
  });
  expect(get()).toBe(42);
  expect(get()).toBe(42);
  expect(calls).toBe(1);
  expectTypeOf(onlyOnce).parameters.toEqualTypeOf<[() => number]>();
  expectTypeOf(onlyOnce).returns.toEqualTypeOf<() => number>();
});

test("問10 makeLimiter", () => {
  const allow = makeLimiter(2);
  expect(allow()).toBe(true);
  expect(allow()).toBe(true);
  expect(allow()).toBe(false);
  expectTypeOf(makeLimiter).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(makeLimiter).returns.toEqualTypeOf<() => boolean>();
});

test("問11 makeHistory", () => {
  const history = makeHistory();
  history.add("a");
  history.add("b");
  const listed = history.list();
  expect(listed).toEqual(["a", "b"]);
  listed.push("x");
  expect(history.list()).toEqual(["a", "b"]);
  expectTypeOf(makeHistory).parameters.toEqualTypeOf<[]>();
  expectTypeOf(makeHistory).returns.toEqualTypeOf<{
    add: (text: string) => void;
    list: () => string[];
  }>();
});

test("問12 makeStack", () => {
  const stack = makeStack();
  stack.push(1);
  stack.push(2);
  expect(stack.size()).toBe(2);
  expect(stack.pop()).toBe(2);
  expect(stack.pop()).toBe(1);
  expect(stack.pop()).toBeUndefined();
  expectTypeOf(makeStack).parameters.toEqualTypeOf<[]>();
  expectTypeOf(makeStack).returns.toEqualTypeOf<{
    push: (n: number) => void;
    pop: () => number | undefined;
    size: () => number;
  }>();
});

test("問13 makeSquareCache", () => {
  const cache = makeSquareCache();
  expect(cache.square(3)).toBe(9);
  expect(cache.square(3)).toBe(9);
  expect(cache.square(4)).toBe(16);
  expect(cache.computed()).toBe(2);
  expectTypeOf(makeSquareCache).parameters.toEqualTypeOf<[]>();
  expectTypeOf(makeSquareCache).returns.toEqualTypeOf<{
    square: (n: number) => number;
    computed: () => number;
  }>();
});

test("問14 makeCycler", () => {
  const next = makeCycler(["a", "b"]);
  expect(next()).toBe("a");
  expect(next()).toBe("b");
  expect(next()).toBe("a");
  expect(() => makeCycler([])).toThrow(Error);
  expectTypeOf(makeCycler).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(makeCycler).returns.toEqualTypeOf<() => string>();
});

test("問15 makeWallet", () => {
  const wallet = makeWallet(1000);
  expect(wallet.withdraw(300)).toBe(700);
  expect(wallet.deposit(50)).toBe(750);
  expect(() => wallet.withdraw(1000)).toThrow("残高が足りません");
  expect(wallet.balance()).toBe(750);
  expectTypeOf(makeWallet).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(makeWallet).returns.toEqualTypeOf<{
    deposit: (n: number) => number;
    withdraw: (n: number) => number;
    balance: () => number;
  }>();
});

test("問16 makeFormatter", () => {
  expect(makeFormatter("kg")(3)).toBe("3kg");
  expectTypeOf(makeFormatter).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(makeFormatter).returns.toEqualTypeOf<(n: number) => string>();
});

test("問17 makeValidator", () => {
  const isValid = makeValidator(1, 10);
  expect(isValid(5)).toBe(true);
  expect(isValid(11)).toBe(false);
  expectTypeOf(makeValidator).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(makeValidator).returns.toEqualTypeOf<(n: number) => boolean>();
});

test("問18 makeLapTimer", () => {
  const lap = makeLapTimer();
  expect(lap(1000)).toBe(1000);
  expect(lap(1500)).toBe(500);
  expect(lap(1600)).toBe(100);
  expectTypeOf(makeLapTimer).parameters.toEqualTypeOf<[]>();
  expectTypeOf(makeLapTimer).returns.toEqualTypeOf<(t: number) => number>();
});

test("問19 partial", () => {
  expect(partial((a, b) => a - b, 10)(3)).toBe(7);
  expectTypeOf(partial).parameters.toEqualTypeOf<[(a: number, b: number) => number, number]>();
  expectTypeOf(partial).returns.toEqualTypeOf<(b: number) => number>();
});

test("問20 makeTagger", () => {
  expect(makeTagger("b")("太字")).toBe("<b>太字</b>");
  expectTypeOf(makeTagger).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(makeTagger).returns.toEqualTypeOf<(text: string) => string>();
});
