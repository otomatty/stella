// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  Point,
  Rect,
  Circle,
  Tally,
  Person,
  Book,
  Stopwatch,
  Purse,
  NumberStack,
  TextQueue,
  Thermometer,
  Score,
  Dice,
  Cart,
  TextBuffer,
  NumberRange,
  Money,
  Vector,
  Lamp,
  Greeter,
} from "../src/q01-class-basics-drill";

test("問1 Point", () => {
  const p = new Point(1, 2);
  expect(p.x).toBe(1);
  expect(p.y).toBe(2);
  expect(p.label()).toBe("(1, 2)");
  expectTypeOf(Point).constructorParameters.toEqualTypeOf<[x: number, y: number]>();
  expectTypeOf<Point["label"]>().toEqualTypeOf<() => string>();
});

test("問2 Rect", () => {
  expect(new Rect(3, 4).area()).toBe(12);
  expectTypeOf(Rect).constructorParameters.toEqualTypeOf<[width: number, height: number]>();
  expectTypeOf<Rect["area"]>().toEqualTypeOf<() => number>();
});

test("問3 Circle", () => {
  const c = new Circle(1);
  expect(c.area()).toBeCloseTo(Math.PI);
  expect(c.circumference()).toBeCloseTo(2 * Math.PI);
  expectTypeOf(Circle).constructorParameters.toEqualTypeOf<[radius: number]>();
  expectTypeOf<Circle["area"]>().toEqualTypeOf<() => number>();
  expectTypeOf<Circle["circumference"]>().toEqualTypeOf<() => number>();
});

test("問4 Tally", () => {
  const t = new Tally();
  expect(t.count).toBe(0);
  expect(t.increment()).toBe(1);
  expect(t.increment()).toBe(2);
  expectTypeOf<Tally["count"]>().toEqualTypeOf<number>();
  expectTypeOf<Tally["increment"]>().toEqualTypeOf<() => number>();
});

test("問5 Person", () => {
  expect(new Person("山田", 30).greet()).toBe("こんにちは、山田です（30歳）");
  expectTypeOf(Person).constructorParameters.toEqualTypeOf<[name: string, age: number]>();
  expectTypeOf<Person["greet"]>().toEqualTypeOf<() => string>();
});

test("問6 Book", () => {
  expect(new Book("入門", 1980).priceWithTax()).toBe(2178);
  expectTypeOf(Book).constructorParameters.toEqualTypeOf<[title: string, price: number]>();
  expectTypeOf<Book["priceWithTax"]>().toEqualTypeOf<() => number>();
});

test("問7 Stopwatch", () => {
  const w = new Stopwatch();
  for (let i = 0; i < 65; i++) {
    w.tick();
  }
  expect(w.seconds).toBe(65);
  expect(w.text()).toBe("01:05");
  expectTypeOf<Stopwatch["tick"]>().toEqualTypeOf<() => void>();
  expectTypeOf<Stopwatch["text"]>().toEqualTypeOf<() => string>();
});

test("問8 Purse", () => {
  const purse = new Purse(500);
  expect(purse.spend(800)).toBe(false);
  expect(purse.spend(300)).toBe(true);
  expect(purse.money).toBe(200);
  expectTypeOf(Purse).constructorParameters.toEqualTypeOf<[money: number]>();
  expectTypeOf<Purse["spend"]>().toEqualTypeOf<(amount: number) => boolean>();
});

test("問9 NumberStack", () => {
  const s = new NumberStack();
  s.push(1);
  s.push(2);
  expect(s.size()).toBe(2);
  expect(s.pop()).toBe(2);
  expect(s.pop()).toBe(1);
  expect(s.pop()).toBeUndefined();
  expectTypeOf<NumberStack["push"]>().toEqualTypeOf<(n: number) => void>();
  expectTypeOf<NumberStack["pop"]>().toEqualTypeOf<() => number | undefined>();
  expectTypeOf<NumberStack["size"]>().toEqualTypeOf<() => number>();
});

test("問10 TextQueue", () => {
  const q = new TextQueue();
  q.enqueue("a");
  q.enqueue("b");
  expect(q.dequeue()).toBe("a");
  expect(q.dequeue()).toBe("b");
  expect(q.dequeue()).toBeUndefined();
  expectTypeOf<TextQueue["enqueue"]>().toEqualTypeOf<(text: string) => void>();
  expectTypeOf<TextQueue["dequeue"]>().toEqualTypeOf<() => string | undefined>();
});

test("問11 Thermometer", () => {
  expect(new Thermometer(100).toFahrenheit()).toBe(212);
  expectTypeOf(Thermometer).constructorParameters.toEqualTypeOf<[celsius: number]>();
  expectTypeOf<Thermometer["toFahrenheit"]>().toEqualTypeOf<() => number>();
});

test("問12 Score", () => {
  const s = new Score();
  s.add(10);
  s.add(5);
  expect(s.points).toBe(15);
  s.reset();
  expect(s.points).toBe(0);
  expectTypeOf<Score["add"]>().toEqualTypeOf<(n: number) => void>();
  expectTypeOf<Score["reset"]>().toEqualTypeOf<() => void>();
});

test("問13 Dice", () => {
  const d = new Dice(6);
  expect(d.isValid(6)).toBe(true);
  expect(d.isValid(7)).toBe(false);
  expect(d.isValid(1.5)).toBe(false);
  expectTypeOf(Dice).constructorParameters.toEqualTypeOf<[faces: number]>();
  expectTypeOf<Dice["isValid"]>().toEqualTypeOf<(n: number) => boolean>();
});

test("問14 Cart", () => {
  const cart = new Cart();
  cart.add("りんご", 150);
  cart.add("みかん", 80);
  expect(cart.total()).toBe(230);
  expect(cart.items).toEqual([
    { name: "りんご", price: 150 },
    { name: "みかん", price: 80 },
  ]);
  expectTypeOf<Cart["add"]>().toEqualTypeOf<(name: string, price: number) => void>();
  expectTypeOf<Cart["total"]>().toEqualTypeOf<() => number>();
});

test("問15 TextBuffer", () => {
  const b = new TextBuffer();
  b.append("ab");
  b.append("c");
  expect(b.text).toBe("abc");
  expect(b.length()).toBe(3);
  b.clear();
  expect(b.length()).toBe(0);
  expectTypeOf<TextBuffer["append"]>().toEqualTypeOf<(s: string) => void>();
  expectTypeOf<TextBuffer["clear"]>().toEqualTypeOf<() => void>();
  expectTypeOf<TextBuffer["length"]>().toEqualTypeOf<() => number>();
});

test("問16 NumberRange", () => {
  const r = new NumberRange(3, 7);
  expect(r.includes(3)).toBe(true);
  expect(r.includes(8)).toBe(false);
  expect(r.size()).toBe(5);
  expectTypeOf(NumberRange).constructorParameters.toEqualTypeOf<[start: number, end: number]>();
  expectTypeOf<NumberRange["includes"]>().toEqualTypeOf<(n: number) => boolean>();
  expectTypeOf<NumberRange["size"]>().toEqualTypeOf<() => number>();
});

test("問17 Money", () => {
  const a = new Money(1000, "円");
  const sum = a.add(new Money(200, "円"));
  expect(sum.format()).toBe("1,200円");
  expect(a.amount).toBe(1000);
  expect(() => a.add(new Money(1, "ドル"))).toThrow("通貨が違います");
  expectTypeOf(Money).constructorParameters.toEqualTypeOf<[amount: number, currency: string]>();
  expectTypeOf<Money["add"]>().toEqualTypeOf<(other: Money) => Money>();
  expectTypeOf<Money["format"]>().toEqualTypeOf<() => string>();
});

test("問18 Vector", () => {
  const v = new Vector(1, 2).plus(new Vector(2, 2));
  expect(v.x).toBe(3);
  expect(v.y).toBe(4);
  expect(v.length()).toBe(5);
  expectTypeOf(Vector).constructorParameters.toEqualTypeOf<[x: number, y: number]>();
  expectTypeOf<Vector["plus"]>().toEqualTypeOf<(other: Vector) => Vector>();
  expectTypeOf<Vector["length"]>().toEqualTypeOf<() => number>();
});

test("問19 Lamp", () => {
  const lamp = new Lamp();
  expect(lamp.on).toBe(false);
  expect(lamp.toggle()).toBe(true);
  expect(lamp.toggle()).toBe(false);
  expectTypeOf<Lamp["on"]>().toEqualTypeOf<boolean>();
  expectTypeOf<Lamp["toggle"]>().toEqualTypeOf<() => boolean>();
});

test("問20 Greeter", () => {
  expect(new Greeter("おはよう").greet("山田")).toBe("おはよう、山田さん");
  expectTypeOf(Greeter).constructorParameters.toEqualTypeOf<[greeting: string]>();
  expectTypeOf<Greeter["greet"]>().toEqualTypeOf<(name: string) => string>();
});
