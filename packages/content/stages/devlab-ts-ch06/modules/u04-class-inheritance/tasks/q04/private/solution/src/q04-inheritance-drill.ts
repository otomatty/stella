// 問1 Animal(name) の speak() は "…"。Animal を継承した Dog の speak() は "ポチ: ワン" を返す（name を使う）
//     例: new Dog("ポチ").speak() → "ポチ: ワン"
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
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

// 問2 Shape の area() は 0。Shape を継承した Square(size) の area() は size × size
//     例: new Square(3).area() → 9
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
// 子クラスの constructor では、最初に super(…) で親の constructor を呼んでください。
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

// 問3 Staff(name, salary) の pay() は salary。Staff を継承した PartTimer(name, hourly, hours) は super(name, 0) を呼び、pay() は hourly × hours
//     例: new PartTimer("鈴木", 1200, 10).pay() → 12000
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
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

// 問4 Vehicle(wheels) の describe() は "車輪 4つ"。Vehicle を継承した Bicycle の constructor は引数なしで super(2) を呼ぶ
//     例: new Bicycle().describe() → "車輪 2つ"
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
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

// 問5 Wallet(balance) の withdraw(n) は残高を減らして返す（残高より多ければ "残高が足りません" の Error）。Wallet を継承した OverdraftAccount(balance, limit) は、残高が -limit になるまで引き出せる。balance は protected にする
//     例: new OverdraftAccount(100, 500).withdraw(300) → -200
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
// 子クラスの constructor では、最初に super(…) で親の constructor を呼んでください。
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

// 問6 Logger の prefix() は "[LOG]"、format(message) は "prefix() + 半角スペース + message"。Logger を継承した ErrorLogger は prefix() だけを "[ERROR]" に上書きする
//     例: new ErrorLogger().format("失敗") → "[ERROR] 失敗"
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
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

// 問7 Greeter の greet(name) は "こんにちは、◯◯さん"。Greeter を継承した PoliteGreeter の greet(name) は、親の結果の後ろに "。よろしくお願いします" を足す（super.greet を使う）
//     例: new PoliteGreeter().greet("山田") → "こんにちは、山田さん。よろしくお願いします"
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
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

// 問8 Counter の value は 0 から。increment() で1増やして返す。Counter を継承した DoubleCounter の increment() は2増やして返す（super.increment() を2回呼んでもよい）
//     例: new DoubleCounter().increment() → 2
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
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

// 問9 Product(name, price) の priceWithTax() は税込（10%。1円未満は切り捨て）。Product を継承した Food は税率 8% にする
//     例: new Food("パン", 200).priceWithTax() → 216
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
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

// 問10 Point2D(x, y) の label() は "(1, 2)"。Point2D を継承した Point3D(x, y, z) の label() は "(1, 2, 3)"
//     例: new Point3D(1, 2, 3).label() → "(1, 2, 3)"
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
// 子クラスの constructor では、最初に super(…) で親の constructor を呼んでください。
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

// 問11 Creature(name)、それを継承した Fish と Bird を書き、関数 kindOf(creature: Creature) で Fish なら "魚"、Bird なら "鳥"、それ以外は "その他" を返す（instanceof を使う）
//     例: kindOf(new Bird("ピーちゃん")) → "鳥"
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
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

// 問12 User(name) の role() は "一般"。User を継承した Admin の role() は "管理者"。関数 roles(users: readonly User[]): string[] は "山田: 一般" の形で並べる
//     例: roles([new User("山田"), new Admin("佐藤")]) → ["山田: 一般", "佐藤: 管理者"]
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
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

// 問13 Rectangle(width, height) の area()。Rectangle を継承した SquareRect(size) は super(size, size) を呼ぶ
//     例: new SquareRect(4).area() → 16
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
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

// 問14 Message(text) の format() は text。Message を継承した UrgentMessage の format() は "【至急】" + 親の結果
//     例: new UrgentMessage("集合").format() → "【至急】集合"
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
// 親の format() は super.format() で呼んでください。
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

// 問15 Timer(seconds) の label() は "60秒"。Timer を継承した Countdown の label() は "残り60秒"
//     例: new Countdown(60).label() → "残り60秒"
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
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

// 問16 Character(hp) の damage(n) は hp を n 減らす（0 より小さくしない。何も返さない）。hp は外から読める。Character を継承した Warrior の damage(n) は、半分（切り捨て）しか減らない
//     例: new Warrior(100) に damage(30) → hp は 85
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
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

// 問17 Notifier の send(message) は "通知: message"。Notifier を継承した EmailNotifier(address) の send(message) は "メール(address): message"
//     例: new EmailNotifier("a@example.com").send("完了") → "メール(a@example.com): 完了"
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
// 子クラスの constructor では、最初に super(…) で親の constructor を呼んでください。
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

// 問18 AdmissionTicket(price) の finalPrice() は price。それを継承した ChildTicket の finalPrice() は半額（切り捨て）
//     例: new ChildTicket(1500).finalPrice() → 750
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
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

// 問19 Collection の items（文字列の配列、初期値は []）に、add(item) で足す（何も返さない）。Collection を継承した UniqueCollection の add は、すでにあるものは足さない
//     例: UniqueCollection に add("a") を2回 → items は ["a"]
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
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

// 問20 Polygon(sides) の describe() は "5角形"。Polygon を継承した Triangle の constructor は引数なしで super(3) を呼ぶ
//     例: new Triangle().describe() → "3角形"
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// クラスの継承には extends を使ってください。
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
