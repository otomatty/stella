// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  type Fruit,
  type LogLevel,
  type Op,
  type Shape,
  type Signal,
  fruitColor,
  fruitPrice,
  nextSignal,
  canCross,
  applyOp,
  opSymbol,
  shapeArea,
  shapeLabel,
  levelValue,
  levelPrefix,
  shouldNotify,
  fail,
  unreachable,
  toFruit,
  countByLevel,
  fruitEmoji,
  signalSeconds,
  opName,
  scaleShape,
  moreSevere,
} from "../src/q07-never.drill";

test("問1 fruitColor", () => {
  expect(fruitColor("apple")).toBe("赤");
  expect(fruitColor("banana")).toBe("黄");
  expect(fruitColor("cherry")).toBe("赤");
  expectTypeOf(fruitColor).parameters.toEqualTypeOf<[Fruit]>();
  expectTypeOf(fruitColor).returns.toEqualTypeOf<string>();
});

test("問2 fruitPrice", () => {
  expect(fruitPrice("apple")).toBe(150);
  expect(fruitPrice("banana")).toBe(100);
  expect(fruitPrice("cherry")).toBe(500);
  expectTypeOf(fruitPrice).parameters.toEqualTypeOf<[Fruit]>();
  expectTypeOf(fruitPrice).returns.toEqualTypeOf<number>();
});

test("問3 nextSignal", () => {
  expect(nextSignal("green")).toBe("yellow");
  expect(nextSignal("yellow")).toBe("red");
  expect(nextSignal("red")).toBe("green");
  expectTypeOf(nextSignal).parameters.toEqualTypeOf<[Signal]>();
  expectTypeOf(nextSignal).returns.toEqualTypeOf<Signal>();
});

test("問4 canCross", () => {
  expect(canCross("green")).toBe(true);
  expect(canCross("yellow")).toBe(false);
  expect(canCross("red")).toBe(false);
  expectTypeOf(canCross).parameters.toEqualTypeOf<[Signal]>();
  expectTypeOf(canCross).returns.toEqualTypeOf<boolean>();
});

test("問5 applyOp", () => {
  expect(applyOp("add", 3, 4)).toBe(7);
  expect(applyOp("sub", 3, 4)).toBe(-1);
  expect(applyOp("mul", 3, 4)).toBe(12);
  expectTypeOf(applyOp).parameters.toEqualTypeOf<[Op, number, number]>();
  expectTypeOf(applyOp).returns.toEqualTypeOf<number>();
});

test("問6 opSymbol", () => {
  expect(opSymbol("add")).toBe("+");
  expect(opSymbol("sub")).toBe("-");
  expect(opSymbol("mul")).toBe("×");
  expectTypeOf(opSymbol).parameters.toEqualTypeOf<[Op]>();
  expectTypeOf(opSymbol).returns.toEqualTypeOf<"+" | "-" | "×">();
});

test("問7 shapeArea", () => {
  expect(shapeArea({ kind: "circle", radius: 2 })).toBeCloseTo(4 * Math.PI);
  expect(shapeArea({ kind: "square", size: 3 })).toBe(9);
  expectTypeOf(shapeArea).parameters.toEqualTypeOf<[Shape]>();
  expectTypeOf(shapeArea).returns.toEqualTypeOf<number>();
});

test("問8 shapeLabel", () => {
  expect(shapeLabel({ kind: "circle", radius: 2 })).toBe("円（半径 2）");
  expect(shapeLabel({ kind: "square", size: 3 })).toBe("正方形（1辺 3）");
  expectTypeOf(shapeLabel).parameters.toEqualTypeOf<[Shape]>();
  expectTypeOf(shapeLabel).returns.toEqualTypeOf<string>();
});

test("問9 levelValue", () => {
  expect(levelValue("debug")).toBe(0);
  expect(levelValue("info")).toBe(1);
  expect(levelValue("warn")).toBe(2);
  expect(levelValue("error")).toBe(3);
  expectTypeOf(levelValue).parameters.toEqualTypeOf<[LogLevel]>();
  expectTypeOf(levelValue).returns.toEqualTypeOf<number>();
});

test("問10 levelPrefix", () => {
  expect(levelPrefix("debug")).toBe("[DEBUG]");
  expect(levelPrefix("info")).toBe("[INFO]");
  expect(levelPrefix("error")).toBe("[ERROR]");
  expectTypeOf(levelPrefix).parameters.toEqualTypeOf<[LogLevel]>();
  expectTypeOf(levelPrefix).returns.toEqualTypeOf<string>();
});

test("問11 shouldNotify", () => {
  expect(shouldNotify("debug")).toBe(false);
  expect(shouldNotify("info")).toBe(false);
  expect(shouldNotify("warn")).toBe(true);
  expect(shouldNotify("error")).toBe(true);
  expectTypeOf(shouldNotify).parameters.toEqualTypeOf<[LogLevel]>();
  expectTypeOf(shouldNotify).returns.toEqualTypeOf<boolean>();
});

test("問12 fail", () => {
  expect(() => fail("だめ")).toThrow("だめ");
  expectTypeOf(fail).parameters.toEqualTypeOf<[string]>();
  expectTypeOf<[ReturnType<typeof fail>]>().toEqualTypeOf<[never]>();
});

test("問13 unreachable", () => {
  expect(() => unreachable()).toThrow("ここには来ないはずです");
  expectTypeOf(unreachable).parameters.toEqualTypeOf<[]>();
  expectTypeOf<[ReturnType<typeof unreachable>]>().toEqualTypeOf<[never]>();
});

test("問14 toFruit", () => {
  expect(toFruit("apple")).toBe("apple");
  expect(() => toFruit("grape")).toThrow("果物ではありません: grape");
  expectTypeOf(toFruit).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(toFruit).returns.toEqualTypeOf<Fruit>();
});

test("問15 countByLevel", () => {
  expect(countByLevel(["info", "warn", "info"])).toEqual({ debug: 0, info: 2, warn: 1, error: 0 });
  expect(countByLevel([])).toEqual({ debug: 0, info: 0, warn: 0, error: 0 });
  expectTypeOf(countByLevel).parameters.toEqualTypeOf<[readonly LogLevel[]]>();
  expectTypeOf(countByLevel).returns.toEqualTypeOf<{
    debug: number;
    info: number;
    warn: number;
    error: number;
  }>();
});

test("問16 fruitEmoji", () => {
  expect(fruitEmoji("apple")).toBe("🍎");
  expect(fruitEmoji("banana")).toBe("🍌");
  expect(fruitEmoji("cherry")).toBe("🍒");
  expectTypeOf(fruitEmoji).parameters.toEqualTypeOf<[Fruit]>();
  expectTypeOf(fruitEmoji).returns.toEqualTypeOf<"🍎" | "🍌" | "🍒">();
});

test("問17 signalSeconds", () => {
  expect(signalSeconds("green")).toBe(30);
  expect(signalSeconds("yellow")).toBe(3);
  expect(signalSeconds("red")).toBe(27);
  expectTypeOf(signalSeconds).parameters.toEqualTypeOf<[Signal]>();
  expectTypeOf(signalSeconds).returns.toEqualTypeOf<number>();
});

test("問18 opName", () => {
  expect(opName("add")).toBe("足し算");
  expect(opName("sub")).toBe("引き算");
  expect(opName("mul")).toBe("掛け算");
  expectTypeOf(opName).parameters.toEqualTypeOf<[Op]>();
  expectTypeOf(opName).returns.toEqualTypeOf<"足し算" | "引き算" | "掛け算">();
});

test("問19 scaleShape", () => {
  expect(scaleShape({ kind: "square", size: 2 }, 3)).toEqual({ kind: "square", size: 6 });
  expect(scaleShape({ kind: "circle", radius: 1 }, 2)).toEqual({ kind: "circle", radius: 2 });
  expectTypeOf(scaleShape).parameters.toEqualTypeOf<[Shape, number]>();
  expectTypeOf(scaleShape).returns.toEqualTypeOf<Shape>();
});

test("問20 moreSevere", () => {
  expect(moreSevere("info", "error")).toBe("error");
  expect(moreSevere("warn", "debug")).toBe("warn");
  expect(moreSevere("info", "info")).toBe("info");
  expectTypeOf(moreSevere).parameters.toEqualTypeOf<[LogLevel, LogLevel]>();
  expectTypeOf(moreSevere).returns.toEqualTypeOf<LogLevel>();
});
