// 問1
export class Account {
  constructor(readonly id: string) {}
}

// 問2
export class Secret {
  constructor(private readonly value: string) {}

  matches(guess: string): boolean {
    return guess === this.value;
  }
}

// 問3
export class HiddenCounter {
  private count = 0;

  increment(): number {
    this.count++;
    return this.count;
  }

  current(): number {
    return this.count;
  }
}

// 問4
export class Password {
  constructor(private readonly raw: string) {}

  check(input: string): boolean {
    return input === this.raw;
  }

  masked(): string {
    return "*".repeat(this.raw.length);
  }
}

// 問5
export class Settings {
  constructor(private readonly values: { [key: string]: string }) {}

  get(key: string): string | undefined {
    return this.values[key];
  }
}

// 問6
export class SerialNumber {
  private nextNumber = 1;

  constructor(private readonly prefix: string) {}

  next(): string {
    const value = `${this.prefix}-${this.nextNumber}`;
    this.nextNumber++;
    return value;
  }
}

// 問7
export class Stock {
  private items: { [item: string]: number } = {};

  add(item: string, n: number): void {
    this.items[item] = (this.items[item] ?? 0) + n;
  }

  count(item: string): number {
    return this.items[item] ?? 0;
  }
}

// 問8
export class Thermostat {
  private target = 20;

  setTarget(n: number): void {
    if (n < 10 || n > 30) {
      throw new Error("10〜30度にしてください");
    }
    this.target = n;
  }

  getTarget(): number {
    return this.target;
  }
}

// 問9
export class Member {
  private loginCount = 0;

  constructor(readonly name: string) {}

  login(): number {
    this.loginCount++;
    return this.loginCount;
  }
}

// 問10
export class FixedPoint {
  constructor(
    readonly x: number,
    readonly y: number,
  ) {}

  moved(dx: number, dy: number): FixedPoint {
    return new FixedPoint(this.x + dx, this.y + dy);
  }
}

// 問11
export class Prepaid {
  constructor(private balance: number) {}

  pay(n: number): void {
    if (n > this.balance) {
      throw new Error("残高が足りません");
    }
    this.balance -= n;
  }

  getBalance(): number {
    return this.balance;
  }
}

// 問12
export class FrozenList {
  private readonly items: string[];

  constructor(items: readonly string[]) {
    this.items = [...items];
  }

  at(i: number): string | undefined {
    return this.items[i];
  }

  size(): number {
    return this.items.length;
  }
}

// 問13
export class Session {
  private token: string | null = null;

  login(token: string): void {
    this.token = token;
  }

  logout(): void {
    this.token = null;
  }

  isLoggedIn(): boolean {
    return this.token !== null;
  }
}

// 問14
export class NumberCache {
  private data: { [key: string]: number } = {};

  set(key: string, value: number): void {
    this.data[key] = value;
  }

  get(key: string): number | undefined {
    return this.data[key];
  }

  has(key: string): boolean {
    return this.data[key] !== undefined;
  }
}

// 問15
export class Journal {
  private entries: string[] = [];

  write(line: string): void {
    this.entries.push(line);
  }

  lines(): string[] {
    return [...this.entries];
  }
}

// 問16
export class Ballot {
  private yesCount = 0;
  private noCount = 0;

  yes(): void {
    this.yesCount++;
  }

  no(): void {
    this.noCount++;
  }

  result(): "賛成" | "反対" | "同数" {
    if (this.yesCount > this.noCount) {
      return "賛成";
    }
    if (this.yesCount < this.noCount) {
      return "反対";
    }
    return "同数";
  }
}

// 問17
export class Review {
  private ratings: number[] = [];

  add(n: number): void {
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      throw new Error("評価は1〜5です");
    }
    this.ratings.push(n);
  }

  average(): number {
    if (this.ratings.length === 0) {
      return 0;
    }
    let total = 0;
    for (const r of this.ratings) {
      total += r;
    }
    return total / this.ratings.length;
  }
}

// 問18
export class Ticket {
  private used = false;

  constructor(readonly id: number) {}

  use(): void {
    if (this.used) {
      throw new Error("使用済みです");
    }
    this.used = true;
  }

  isUsed(): boolean {
    return this.used;
  }
}

// 問19
export class Tank {
  private amount = 0;

  constructor(readonly capacity: number) {}

  refill(n: number): number {
    this.amount = Math.min(this.amount + n, this.capacity);
    return this.amount;
  }
}

// 問20
export class Animal {
  constructor(protected readonly name: string) {}
}

export class PetDog extends Animal {
  speak(): string {
    return `${this.name}: ワン`;
  }
}
