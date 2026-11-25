// 問1 Point(x, y)。フィールド x と y。label() で "(1, 2)" を返す
//     例: new Point(1, 2).label() → "(1, 2)"
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// フィールドは宣言し、値は宣言時か constructor の中で設定してください。
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

// 問2 Rect(width, height)。area() で面積を返す
//     例: new Rect(3, 4).area() → 12
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// フィールドは宣言し、値は宣言時か constructor の中で設定してください。
// フィールドは public（修飾子なし）でかまいません。
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

// 問3 Circle(radius)。area() で面積、circumference() で円周（2 × Math.PI × 半径）を返す
//     例: new Circle(1).circumference() → 6.28…
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// フィールドは宣言し、値は宣言時か constructor の中で設定してください。
// フィールドは public（修飾子なし）でかまいません。
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

// 問4 Tally。フィールド count の初期値は 0。increment() で1増やし、増やした後の値を返す
//     例: new Tally().increment() → 1
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// フィールドは宣言し、値は宣言時か constructor の中で設定してください。
export class Tally {
  count = 0;

  increment(): number {
    this.count++;
    return this.count;
  }
}

// 問5 Person(name, age)。greet() で「こんにちは、山田です（30歳）」を返す
//     例: new Person("山田", 30).greet() → "こんにちは、山田です（30歳）"
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// フィールドは宣言し、値は宣言時か constructor の中で設定してください。
// フィールドは public（修飾子なし）でかまいません。
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

// 問6 Book(title, price)。priceWithTax() で税込価格（10%。1円未満は切り捨て）を返す
//     例: new Book("入門", 1980).priceWithTax() → 2178
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// フィールドは宣言し、値は宣言時か constructor の中で設定してください。
// フィールドは public（修飾子なし）でかまいません。
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

// 問7 Stopwatch。フィールド seconds の初期値は 0。tick() で1秒進める（何も返さない）。text() で "00:05" の形（分:秒、どちらも2桁）を返す
//     例: 5回 tick() した後の text() → "00:05"
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// フィールドは宣言し、値は宣言時か constructor の中で設定してください。
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

// 問8 Purse(money)。spend(amount) で、足りれば money を減らして true、足りなければ何もせず false を返す
//     例: new Purse(500).spend(800) → false
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// フィールドは宣言し、値は宣言時か constructor の中で設定してください。
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

// 問9 NumberStack。フィールド items（数値の配列、初期値は []）。push(n) で積む（何も返さない）。pop() で最後に積んだものを取り出して返す（空なら undefined）。size() で数を返す
//     例: push(1)、push(2) の後の pop() → 2
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// フィールドは宣言し、値は宣言時か constructor の中で設定してください。
// フィールドは public（修飾子なし）でかまいません。
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

// 問10 TextQueue。フィールド items（文字列の配列、初期値は []）。enqueue(text) で末尾に足す（何も返さない）。dequeue() で先頭を取り出して返す（空なら undefined）
//     例: enqueue("a")、enqueue("b") の後の dequeue() → "a"
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// フィールドは宣言し、値は宣言時か constructor の中で設定してください。
// フィールドは public（修飾子なし）でかまいません。
export class TextQueue {
  items: string[] = [];

  enqueue(text: string): void {
    this.items.push(text);
  }

  dequeue(): string | undefined {
    return this.items.shift();
  }
}

// 問11 Thermometer(celsius)。toFahrenheit() で華氏（摂氏 × 9 ÷ 5 + 32）を返す
//     例: new Thermometer(100).toFahrenheit() → 212
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// フィールドは宣言し、値は宣言時か constructor の中で設定してください。
// フィールドは public（修飾子なし）でかまいません。
export class Thermometer {
  celsius: number;

  constructor(celsius: number) {
    this.celsius = celsius;
  }

  toFahrenheit(): number {
    return (this.celsius * 9) / 5 + 32;
  }
}

// 問12 Score。フィールド points の初期値は 0。add(n) で足す（何も返さない）。reset() で 0 に戻す（何も返さない）
//     例: add(10)、add(5) の後の points → 15
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// フィールドは宣言し、値は宣言時か constructor の中で設定してください。
export class Score {
  points = 0;

  add(n: number): void {
    this.points += n;
  }

  reset(): void {
    this.points = 0;
  }
}

// 問13 Dice(faces)。isValid(n) で、n が 1 以上 faces 以下の整数なら true
//     例: new Dice(6).isValid(7) → false
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// フィールドは宣言し、値は宣言時か constructor の中で設定してください。
// フィールドは public（修飾子なし）でかまいません。
export class Dice {
  faces: number;

  constructor(faces: number) {
    this.faces = faces;
  }

  isValid(n: number): boolean {
    return Number.isInteger(n) && n >= 1 && n <= this.faces;
  }
}

// 問14 Cart。フィールド items（{ name: string; price: number } の配列、初期値は []）。add(name, price) で足す（何も返さない）。total() で合計金額を返す
//     例: add("りんご", 150)、add("みかん", 80) の後の total() → 230
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// フィールドは宣言し、値は宣言時か constructor の中で設定してください。
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

// 問15 TextBuffer。フィールド text の初期値は ""。append(s) で末尾に足す（何も返さない）。clear() で空にする。length() で文字数を返す
//     例: append("ab")、append("c") の後の length() → 3
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// フィールドは宣言し、値は宣言時か constructor の中で設定してください。
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

// 問16 NumberRange(start, end)。includes(n) で start 以上 end 以下なら true。size() で含まれる整数の個数（end - start + 1）を返す
//     例: new NumberRange(3, 7).size() → 5
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// フィールドは宣言し、値は宣言時か constructor の中で設定してください。
// フィールドは public（修飾子なし）でかまいません。
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

// 問17 Money(amount, currency)。add(other) で、同じ通貨なら合計した新しい Money を返す。通貨が違えば "通貨が違います" の Error。format() で "1,200円" の形（金額 + 通貨）を返す
//     例: new Money(1000, "円").add(new Money(200, "円")).format() → "1,200円"
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// フィールドは宣言し、値は宣言時か constructor の中で設定してください。
// フィールドは public（修飾子なし）でかまいません。
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

// 問18 Vector(x, y)。plus(other) で足した新しい Vector を返す。length() で長さ（Math.hypot）を返す
//     例: new Vector(1, 2).plus(new Vector(2, 2)).length() → 5
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// フィールドは宣言し、値は宣言時か constructor の中で設定してください。
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

// 問19 Lamp。フィールド on の初期値は false。toggle() で on を反転し、反転した後の値を返す
//     例: new Lamp().toggle() → true
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// フィールドは宣言し、値は宣言時か constructor の中で設定してください。
export class Lamp {
  on = false;

  toggle(): boolean {
    this.on = !this.on;
    return this.on;
  }
}

// 問20 Greeter(greeting)。greet(name) で「greeting、◯◯さん」を返す
//     例: new Greeter("おはよう").greet("山田") → "おはよう、山田さん"
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// フィールドは宣言し、値は宣言時か constructor の中で設定してください。
// フィールドは public（修飾子なし）でかまいません。
export class Greeter {
  greeting: string;

  constructor(greeting: string) {
    this.greeting = greeting;
  }

  greet(name: string): string {
    return `${this.greeting}、${name}さん`;
  }
}
