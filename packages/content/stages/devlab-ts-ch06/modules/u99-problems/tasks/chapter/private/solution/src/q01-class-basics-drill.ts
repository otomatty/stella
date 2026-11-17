// 問1
export class Point {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  label(): string {
    return `(${this.x}, ${this.y})`;
  }
}

// 問2
export class Rect {
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  area(): number {
    return this.width * this.height;
  }
}

// 問3
export class Circle {
  radius: number;

  constructor(radius: number) {
    this.radius = radius;
  }

  area(): number {
    return Math.PI * this.radius * this.radius;
  }

  circumference(): number {
    return 2 * Math.PI * this.radius;
  }
}

// 問4
export class Tally {
  count = 0;

  increment(): number {
    this.count++;
    return this.count;
  }
}

// 問5
export class Person {
  name: string;
  age: number;

  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }

  greet(): string {
    return `こんにちは、${this.name}です（${this.age}歳）`;
  }
}

// 問6
export class Book {
  title: string;
  price: number;

  constructor(title: string, price: number) {
    this.title = title;
    this.price = price;
  }

  priceWithTax(): number {
    return Math.floor((this.price * 110) / 100);
  }
}

// 問7
export class Stopwatch {
  seconds = 0;

  tick(): void {
    this.seconds++;
  }

  text(): string {
    const m = String(Math.floor(this.seconds / 60)).padStart(2, "0");
    const s = String(this.seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  }
}

// 問8
export class Purse {
  money: number;

  constructor(money: number) {
    this.money = money;
  }

  spend(amount: number): boolean {
    if (amount > this.money) {
      return false;
    }
    this.money -= amount;
    return true;
  }
}

// 問9
export class NumberStack {
  items: number[] = [];

  push(n: number): void {
    this.items.push(n);
  }

  pop(): number | undefined {
    return this.items.pop();
  }

  size(): number {
    return this.items.length;
  }
}

// 問10
export class TextQueue {
  items: string[] = [];

  enqueue(text: string): void {
    this.items.push(text);
  }

  dequeue(): string | undefined {
    return this.items.shift();
  }
}

// 問11
export class Thermometer {
  celsius: number;

  constructor(celsius: number) {
    this.celsius = celsius;
  }

  toFahrenheit(): number {
    return (this.celsius * 9) / 5 + 32;
  }
}

// 問12
export class Score {
  points = 0;

  add(n: number): void {
    this.points += n;
  }

  reset(): void {
    this.points = 0;
  }
}

// 問13
export class Dice {
  faces: number;

  constructor(faces: number) {
    this.faces = faces;
  }

  isValid(n: number): boolean {
    return Number.isInteger(n) && n >= 1 && n <= this.faces;
  }
}

// 問14
export class Cart {
  items: { name: string; price: number }[] = [];

  add(name: string, price: number): void {
    this.items.push({ name, price });
  }

  total(): number {
    let sum = 0;
    for (const item of this.items) {
      sum += item.price;
    }
    return sum;
  }
}

// 問15
export class TextBuffer {
  text = "";

  append(s: string): void {
    this.text += s;
  }

  clear(): void {
    this.text = "";
  }

  length(): number {
    return this.text.length;
  }
}

// 問16
export class NumberRange {
  start: number;
  end: number;

  constructor(start: number, end: number) {
    this.start = start;
    this.end = end;
  }

  includes(n: number): boolean {
    return n >= this.start && n <= this.end;
  }

  size(): number {
    return this.end - this.start + 1;
  }
}

// 問17
export class Money {
  amount: number;
  currency: string;

  constructor(amount: number, currency: string) {
    this.amount = amount;
    this.currency = currency;
  }

  add(other: Money): Money {
    if (other.currency !== this.currency) {
      throw new Error("通貨が違います");
    }
    return new Money(this.amount + other.amount, this.currency);
  }

  format(): string {
    return `${this.amount.toLocaleString("ja-JP")}${this.currency}`;
  }
}

// 問18
export class Vector {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  plus(other: Vector): Vector {
    return new Vector(this.x + other.x, this.y + other.y);
  }

  length(): number {
    return Math.hypot(this.x, this.y);
  }
}

// 問19
export class Lamp {
  on = false;

  toggle(): boolean {
    this.on = !this.on;
    return this.on;
  }
}

// 問20
export class Greeter {
  greeting: string;

  constructor(greeting: string) {
    this.greeting = greeting;
  }

  greet(name: string): string {
    return `${this.greeting}、${name}さん`;
  }
}
