// 問1
export interface Named {
  name: string;
}

export class Cat implements Named {
  constructor(public name: string) {}

  meow(): string {
    return `${this.name}: ニャー`;
  }
}

// 問2
export interface HasArea {
  area(): number;
}

export class Square implements HasArea {
  constructor(private readonly size: number) {}

  area(): number {
    return this.size * this.size;
  }
}

// 問3
export interface Greeting {
  greet(name: string): string;
}

export class JapaneseGreeting implements Greeting {
  greet(name: string): string {
    return `こんにちは、${name}さん`;
  }
}

// 問4
export interface Figure {
  name: string;
  area(): number;
}

export function describeShape(figure: Figure): string {
  return `${figure.name}（面積 ${figure.area()}）`;
}

// 問5
export interface Priced {
  price: number;
}

export function totalPrice(items: readonly Priced[]): number {
  let total = 0;
  for (const item of items) {
    total += item.price;
  }
  return total;
}

// 問6
export interface Instrument {
  play(): string;
}

export class Bell implements Instrument {
  play(): string {
    return "チリン";
  }
}

export class Drum implements Instrument {
  play(): string {
    return "ドン";
  }
}

export function playAll(instruments: readonly Instrument[]): string[] {
  return instruments.map((instrument) => instrument.play());
}

// 問7
export interface FixedPoint {
  readonly x: number;
  readonly y: number;
}

export function origin(): FixedPoint {
  return { x: 0, y: 0 };
}

// 問8
export interface Animal {
  name: string;
}

export interface Dog extends Animal {
  breed: string;
}

export function dogLabel(dog: Dog): string {
  return `${dog.name}（${dog.breed}）`;
}

// 問9
export interface Logger {
  log(message: string): void;
}

export class MemoryLogger implements Logger {
  lines: string[] = [];

  log(message: string): void {
    this.lines.push(message);
  }
}

// 問10
export interface KeyValueStore {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
}

export class MemoryStore implements KeyValueStore {
  private data: { [key: string]: string } = {};

  get(key: string): string | undefined {
    return this.data[key];
  }

  set(key: string, value: string): void {
    this.data[key] = value;
  }
}

// 問11
export interface Vehicle {
  wheels: number;
  move(): string;
}

export class Bike implements Vehicle {
  wheels = 2;

  move(): string {
    return "スイスイ";
  }
}

export class Car implements Vehicle {
  wheels = 4;

  move(): string {
    return "ブーン";
  }
}

// 問12
export interface Validator {
  validate(value: string): boolean;
}

export class MinLength implements Validator {
  constructor(private readonly min: number) {}

  validate(value: string): boolean {
    return value.length >= this.min;
  }
}

// 問13
export interface Clock {
  now(): number;
}

export class FixedClock implements Clock {
  constructor(private readonly time: number) {}

  now(): number {
    return this.time;
  }
}

export function elapsedSince(clock: Clock, start: number): number {
  return clock.now() - start;
}

// 問14
export interface PriceFormatter {
  format(n: number): string;
}

export class YenFormatter implements PriceFormatter {
  format(n: number): string {
    return `${n.toLocaleString("ja-JP")}円`;
  }
}

// 問15
export interface TallyLike {
  count: number;
  increment(): void;
}

export function makeTally(): TallyLike {
  const tally: TallyLike = {
    count: 0,
    increment() {
      tally.count++;
    },
  };
  return tally;
}

// 問16
export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D extends Point2D {
  z: number;
}

export function length3d(p: Point3D): number {
  return Math.hypot(p.x, p.y, p.z);
}

// 問17
export interface LogEntry {
  message: string;
  at: number;
}

export function latestEntry(entries: readonly LogEntry[]): LogEntry | undefined {
  let latest: LogEntry | undefined;
  for (const entry of entries) {
    if (latest === undefined || entry.at > latest.at) {
      latest = entry;
    }
  }
  return latest;
}

// 問18
export interface Repository {
  findById(id: number): string | undefined;
}

export class ArrayRepository implements Repository {
  constructor(private readonly items: readonly string[]) {}

  findById(id: number): string | undefined {
    return this.items[id - 1];
  }
}

// 問19
export interface Discount {
  apply(price: number): number;
}

export class PercentOff implements Discount {
  constructor(private readonly rate: number) {}

  apply(price: number): number {
    return Math.floor((price * (100 - this.rate)) / 100);
  }
}

export class AmountOff implements Discount {
  constructor(private readonly amount: number) {}

  apply(price: number): number {
    return Math.max(price - this.amount, 0);
  }
}

export function applyDiscounts(price: number, discounts: readonly Discount[]): number {
  let result = price;
  for (const discount of discounts) {
    result = discount.apply(result);
  }
  return result;
}

// 問20
export interface Serializable {
  serialize(): string;
}

export class JsonUser implements Serializable {
  constructor(
    readonly name: string,
    readonly age: number,
  ) {}

  serialize(): string {
    return JSON.stringify({ name: this.name, age: this.age });
  }
}
