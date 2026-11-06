export function assertNever(value: never): never {
  throw new Error(`想定していない値です: ${JSON.stringify(value)}`);
}

export type Fruit = "apple" | "banana" | "cherry";
export type Signal = "red" | "yellow" | "green";
export type Op = "add" | "sub" | "mul";
export type Shape = { kind: "circle"; radius: number } | { kind: "square"; size: number };
export type LogLevel = "debug" | "info" | "warn" | "error";

// 問1
export function fruitColor(fruit: Fruit): string {
  switch (fruit) {
    case "apple":
      return "赤";
    case "banana":
      return "黄";
    case "cherry":
      return "赤";
    default:
      return assertNever(fruit);
  }
}

// 問2
export function fruitPrice(fruit: Fruit): number {
  switch (fruit) {
    case "apple":
      return 150;
    case "banana":
      return 100;
    case "cherry":
      return 500;
    default:
      return assertNever(fruit);
  }
}

// 問3
export function nextSignal(signal: Signal): Signal {
  switch (signal) {
    case "green":
      return "yellow";
    case "yellow":
      return "red";
    case "red":
      return "green";
    default:
      return assertNever(signal);
  }
}

// 問4
export function canCross(signal: Signal): boolean {
  switch (signal) {
    case "green":
      return true;
    case "yellow":
    case "red":
      return false;
    default:
      return assertNever(signal);
  }
}

// 問5
export function applyOp(op: Op, a: number, b: number): number {
  switch (op) {
    case "add":
      return a + b;
    case "sub":
      return a - b;
    case "mul":
      return a * b;
    default:
      return assertNever(op);
  }
}

// 問6
export function opSymbol(op: Op): "+" | "-" | "×" {
  switch (op) {
    case "add":
      return "+";
    case "sub":
      return "-";
    case "mul":
      return "×";
    default:
      return assertNever(op);
  }
}

// 問7
export function shapeArea(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius * shape.radius;
    case "square":
      return shape.size * shape.size;
    default:
      return assertNever(shape);
  }
}

// 問8
export function shapeLabel(shape: Shape): string {
  switch (shape.kind) {
    case "circle":
      return `円（半径 ${shape.radius}）`;
    case "square":
      return `正方形（1辺 ${shape.size}）`;
    default:
      return assertNever(shape);
  }
}

// 問9
export function levelValue(level: LogLevel): number {
  switch (level) {
    case "debug":
      return 0;
    case "info":
      return 1;
    case "warn":
      return 2;
    case "error":
      return 3;
    default:
      return assertNever(level);
  }
}

// 問10
export function levelPrefix(level: LogLevel): string {
  switch (level) {
    case "debug":
      return "[DEBUG]";
    case "info":
      return "[INFO]";
    case "warn":
      return "[WARN]";
    case "error":
      return "[ERROR]";
    default:
      return assertNever(level);
  }
}

// 問11
export function shouldNotify(level: LogLevel): boolean {
  switch (level) {
    case "debug":
    case "info":
      return false;
    case "warn":
    case "error":
      return true;
    default:
      return assertNever(level);
  }
}

// 問12
export function fail(message: string): never {
  throw new Error(message);
}

// 問13
export function unreachable(): never {
  throw new Error("ここには来ないはずです");
}

// 問14
export function toFruit(text: string): Fruit {
  if (text === "apple" || text === "banana" || text === "cherry") {
    return text;
  }
  throw new Error(`果物ではありません: ${text}`);
}

// 問15
export function countByLevel(levels: readonly LogLevel[]): {
  debug: number;
  info: number;
  warn: number;
  error: number;
} {
  const counts = { debug: 0, info: 0, warn: 0, error: 0 };
  for (const level of levels) {
    switch (level) {
      case "debug":
        counts.debug++;
        break;
      case "info":
        counts.info++;
        break;
      case "warn":
        counts.warn++;
        break;
      case "error":
        counts.error++;
        break;
      default:
        assertNever(level);
    }
  }
  return counts;
}

// 問16
export function fruitEmoji(fruit: Fruit): "🍎" | "🍌" | "🍒" {
  switch (fruit) {
    case "apple":
      return "🍎";
    case "banana":
      return "🍌";
    case "cherry":
      return "🍒";
    default:
      return assertNever(fruit);
  }
}

// 問17
export function signalSeconds(signal: Signal): number {
  switch (signal) {
    case "green":
      return 30;
    case "yellow":
      return 3;
    case "red":
      return 27;
    default:
      return assertNever(signal);
  }
}

// 問18
export function opName(op: Op): "足し算" | "引き算" | "掛け算" {
  switch (op) {
    case "add":
      return "足し算";
    case "sub":
      return "引き算";
    case "mul":
      return "掛け算";
    default:
      return assertNever(op);
  }
}

// 問19
export function scaleShape(shape: Shape, k: number): Shape {
  switch (shape.kind) {
    case "circle":
      return { kind: "circle", radius: shape.radius * k };
    case "square":
      return { kind: "square", size: shape.size * k };
    default:
      return assertNever(shape);
  }
}

// 問20
export function moreSevere(a: LogLevel, b: LogLevel): LogLevel {
  const order: LogLevel[] = ["debug", "info", "warn", "error"];
  return order.indexOf(b) > order.indexOf(a) ? b : a;
}
