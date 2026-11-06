// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  Animal,
  Dog,
  Shape,
  Square,
  Staff,
  PartTimer,
  Vehicle,
  Bicycle,
  Wallet,
  OverdraftAccount,
  Logger,
  ErrorLogger,
  Greeter,
  PoliteGreeter,
  Counter,
  DoubleCounter,
  Product,
  Food,
  Point2D,
  Point3D,
  Creature,
  Fish,
  Bird,
  kindOf,
  User,
  Admin,
  roles,
  Rectangle,
  SquareRect,
  Message,
  UrgentMessage,
  Timer,
  Countdown,
  Character,
  Warrior,
  Notifier,
  EmailNotifier,
  AdmissionTicket,
  ChildTicket,
  Collection,
  UniqueCollection,
  Polygon,
  Triangle,
} from "../src/q04-inheritance.drill";

test("問1 Dog", () => {
  expect(new Animal("なにか").speak()).toBe("…");
  expect(new Dog("ポチ").speak()).toBe("ポチ: ワン");
  expect(new Dog("ポチ")).toBeInstanceOf(Animal);
});

test("問2 Square", () => {
  expect(new Shape().area()).toBe(0);
  expect(new Square(3).area()).toBe(9);
  const shape: Shape = new Square(2);
  expect(shape.area()).toBe(4);
});

test("問3 PartTimer", () => {
  expect(new Staff("山田", 300000).pay()).toBe(300000);
  expect(new PartTimer("鈴木", 1200, 10).pay()).toBe(12000);
  expect(new PartTimer("鈴木", 1200, 10).name).toBe("鈴木");
  expectTypeOf(PartTimer).constructorParameters.toEqualTypeOf<
    [name: string, hourly: number, hours: number]
  >();
});

test("問4 Bicycle", () => {
  expect(new Vehicle(4).describe()).toBe("車輪 4つ");
  expect(new Bicycle().describe()).toBe("車輪 2つ");
  expectTypeOf(Bicycle).constructorParameters.toEqualTypeOf<[]>();
});

test("問5 OverdraftAccount", () => {
  expect(() => new Wallet(100).withdraw(300)).toThrow("残高が足りません");
  const account = new OverdraftAccount(100, 500);
  expect(account.withdraw(300)).toBe(-200);
  expect(() => account.withdraw(400)).toThrow("残高が足りません");
});

test("問6 ErrorLogger", () => {
  expect(new Logger().format("起動")).toBe("[LOG] 起動");
  expect(new ErrorLogger().format("失敗")).toBe("[ERROR] 失敗");
});

test("問7 PoliteGreeter", () => {
  expect(new Greeter().greet("山田")).toBe("こんにちは、山田さん");
  expect(new PoliteGreeter().greet("山田")).toBe("こんにちは、山田さん。よろしくお願いします");
});

test("問8 DoubleCounter", () => {
  expect(new Counter().increment()).toBe(1);
  const d = new DoubleCounter();
  d.increment();
  expect(d.increment()).toBe(4);
});

test("問9 Food", () => {
  expect(new Product("ペン", 200).priceWithTax()).toBe(220);
  expect(new Food("パン", 200).priceWithTax()).toBe(216);
});

test("問10 Point3D", () => {
  expect(new Point2D(1, 2).label()).toBe("(1, 2)");
  expect(new Point3D(1, 2, 3).label()).toBe("(1, 2, 3)");
});

test("問11 kindOf", () => {
  expect(kindOf(new Fish("金魚"))).toBe("魚");
  expect(kindOf(new Bird("ピーちゃん"))).toBe("鳥");
  expect(kindOf(new Creature("なにか"))).toBe("その他");
});

test("問12 roles", () => {
  expect(roles([new User("山田"), new Admin("佐藤")])).toEqual(["山田: 一般", "佐藤: 管理者"]);
});

test("問13 SquareRect", () => {
  expect(new Rectangle(2, 3).area()).toBe(6);
  expect(new SquareRect(4).area()).toBe(16);
  expect(new SquareRect(4).width).toBe(4);
  expectTypeOf(SquareRect).constructorParameters.toEqualTypeOf<[size: number]>();
});

test("問14 UrgentMessage", () => {
  expect(new Message("集合").format()).toBe("集合");
  expect(new UrgentMessage("集合").format()).toBe("【至急】集合");
});

test("問15 Countdown", () => {
  expect(new Timer(60).label()).toBe("60秒");
  expect(new Countdown(60).label()).toBe("残り60秒");
});

test("問16 Warrior", () => {
  const c = new Character(100);
  c.damage(30);
  expect(c.hp).toBe(70);
  const w = new Warrior(100);
  w.damage(30);
  expect(w.hp).toBe(85);
  w.damage(500);
  expect(w.hp).toBe(0);
});

test("問17 EmailNotifier", () => {
  expect(new Notifier().send("完了")).toBe("通知: 完了");
  expect(new EmailNotifier("a@example.com").send("完了")).toBe("メール(a@example.com): 完了");
});

test("問18 ChildTicket", () => {
  expect(new AdmissionTicket(1500).finalPrice()).toBe(1500);
  expect(new ChildTicket(1500).finalPrice()).toBe(750);
  expect(new ChildTicket(999).finalPrice()).toBe(499);
});

test("問19 UniqueCollection", () => {
  const c = new Collection();
  c.add("a");
  c.add("a");
  expect(c.items).toEqual(["a", "a"]);
  const u = new UniqueCollection();
  u.add("a");
  u.add("a");
  u.add("b");
  expect(u.items).toEqual(["a", "b"]);
});

test("問20 Triangle", () => {
  expect(new Polygon(5).describe()).toBe("5角形");
  expect(new Triangle().describe()).toBe("3角形");
  expectTypeOf(Triangle).constructorParameters.toEqualTypeOf<[]>();
});
