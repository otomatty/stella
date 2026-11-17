// 問1
export class Animal {
  constructor(readonly name: string) {}

  speak(): string {
    return "…";
  }
}

export class Dog extends Animal {
  override speak(): string {
    return `${this.name}: ワン`;
  }
}

// 問2
export class Shape {
  area(): number {
    return 0;
  }
}

export class Square extends Shape {
  constructor(readonly size: number) {
    super();
  }

  override area(): number {
    return this.size * this.size;
  }
}

// 問3
export class Staff {
  constructor(
    readonly name: string,
    readonly salary: number,
  ) {}

  pay(): number {
    return this.salary;
  }
}

export class PartTimer extends Staff {
  constructor(
    name: string,
    readonly hourly: number,
    readonly hours: number,
  ) {
    super(name, 0);
  }

  override pay(): number {
    return this.hourly * this.hours;
  }
}

// 問4
export class Vehicle {
  constructor(readonly wheels: number) {}

  describe(): string {
    return `車輪 ${this.wheels}つ`;
  }
}

export class Bicycle extends Vehicle {
  constructor() {
    super(2);
  }
}

// 問5
export class Wallet {
  constructor(protected balance: number) {}

  withdraw(n: number): number {
    if (n > this.balance) {
      throw new Error("残高が足りません");
    }
    this.balance -= n;
    return this.balance;
  }
}

export class OverdraftAccount extends Wallet {
  constructor(
    balance: number,
    private readonly limit: number,
  ) {
    super(balance);
  }

  override withdraw(n: number): number {
    if (this.balance - n < -this.limit) {
      throw new Error("残高が足りません");
    }
    this.balance -= n;
    return this.balance;
  }
}

// 問6
export class Logger {
  prefix(): string {
    return "[LOG]";
  }

  format(message: string): string {
    return `${this.prefix()} ${message}`;
  }
}

export class ErrorLogger extends Logger {
  override prefix(): string {
    return "[ERROR]";
  }
}

// 問7
export class Greeter {
  greet(name: string): string {
    return `こんにちは、${name}さん`;
  }
}

export class PoliteGreeter extends Greeter {
  override greet(name: string): string {
    return `${super.greet(name)}。よろしくお願いします`;
  }
}

// 問8
export class Counter {
  value = 0;

  increment(): number {
    this.value++;
    return this.value;
  }
}

export class DoubleCounter extends Counter {
  override increment(): number {
    super.increment();
    return super.increment();
  }
}

// 問9
export class Product {
  constructor(
    readonly name: string,
    readonly price: number,
  ) {}

  priceWithTax(): number {
    return Math.floor((this.price * 110) / 100);
  }
}

export class Food extends Product {
  override priceWithTax(): number {
    return Math.floor((this.price * 108) / 100);
  }
}

// 問10
export class Point2D {
  constructor(
    readonly x: number,
    readonly y: number,
  ) {}

  label(): string {
    return `(${this.x}, ${this.y})`;
  }
}

export class Point3D extends Point2D {
  constructor(
    x: number,
    y: number,
    readonly z: number,
  ) {
    super(x, y);
  }

  override label(): string {
    return `(${this.x}, ${this.y}, ${this.z})`;
  }
}

// 問11
export class Creature {
  constructor(readonly name: string) {}
}

export class Fish extends Creature {}

export class Bird extends Creature {}

export function kindOf(creature: Creature): "魚" | "鳥" | "その他" {
  if (creature instanceof Fish) {
    return "魚";
  }
  if (creature instanceof Bird) {
    return "鳥";
  }
  return "その他";
}

// 問12
export class User {
  constructor(readonly name: string) {}

  role(): string {
    return "一般";
  }
}

export class Admin extends User {
  override role(): string {
    return "管理者";
  }
}

export function roles(users: readonly User[]): string[] {
  return users.map((user) => `${user.name}: ${user.role()}`);
}

// 問13
export class Rectangle {
  constructor(
    readonly width: number,
    readonly height: number,
  ) {}

  area(): number {
    return this.width * this.height;
  }
}

export class SquareRect extends Rectangle {
  constructor(size: number) {
    super(size, size);
  }
}

// 問14
export class Message {
  constructor(readonly text: string) {}

  format(): string {
    return this.text;
  }
}

export class UrgentMessage extends Message {
  override format(): string {
    return `【至急】${super.format()}`;
  }
}

// 問15
export class Timer {
  constructor(readonly seconds: number) {}

  label(): string {
    return `${this.seconds}秒`;
  }
}

export class Countdown extends Timer {
  override label(): string {
    return `残り${super.label()}`;
  }
}

// 問16
export class Character {
  constructor(public hp: number) {}

  damage(n: number): void {
    this.hp = Math.max(this.hp - n, 0);
  }
}

export class Warrior extends Character {
  override damage(n: number): void {
    super.damage(Math.floor(n / 2));
  }
}

// 問17
export class Notifier {
  send(message: string): string {
    return `通知: ${message}`;
  }
}

export class EmailNotifier extends Notifier {
  constructor(private readonly address: string) {
    super();
  }

  override send(message: string): string {
    return `メール(${this.address}): ${message}`;
  }
}

// 問18
export class AdmissionTicket {
  constructor(readonly price: number) {}

  finalPrice(): number {
    return this.price;
  }
}

export class ChildTicket extends AdmissionTicket {
  override finalPrice(): number {
    return Math.floor(super.finalPrice() / 2);
  }
}

// 問19
export class Collection {
  items: string[] = [];

  add(item: string): void {
    this.items.push(item);
  }
}

export class UniqueCollection extends Collection {
  override add(item: string): void {
    if (!this.items.includes(item)) {
      super.add(item);
    }
  }
}

// 問20
export class Polygon {
  constructor(readonly sides: number) {}

  describe(): string {
    return `${this.sides}角形`;
  }
}

export class Triangle extends Polygon {
  constructor() {
    super(3);
  }
}
