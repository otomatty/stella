// 問1 interface Named（name: string）と、それを実装する class Cat(name) を書く。Cat の meow() は "ミケ: ニャー" を返す
//     例: new Cat("ミケ").meow() → "ミケ: ニャー"
// 型は interface で宣言し、クラスには implements Named を付けてください。
// 引数と戻り値には型注釈を付けてください。
export interface Named {
  name: string;
}

export class Cat implements Named {
  constructor(public name: string) {}

  meow(): string {
    return `${this.name}: ニャー`;
  }
}

// 問2 interface HasArea（area(): number）と、それを実装する class Square(size) を書く
//     例: new Square(3).area() → 9
// 型は interface で宣言し、クラスには implements HasArea を付けてください。
// 引数と戻り値には型注釈を付けてください。
export interface HasArea {
  area(): number;
}

export class Square implements HasArea {
  constructor(private readonly size: number) {}

  area(): number {
    return this.size * this.size;
  }
}

// 問3 interface Greeting（greet(name: string): string）と、それを実装する class JapaneseGreeting を書く。greet は "こんにちは、◯◯さん"
//     例: new JapaneseGreeting().greet("山田") → "こんにちは、山田さん"
// 型は interface で宣言し、クラスには implements Greeting を付けてください。
// 引数と戻り値には型注釈を付けてください。
export interface Greeting {
  greet(name: string): string;
}

export class JapaneseGreeting implements Greeting {
  greet(name: string): string {
    return `こんにちは、${name}さん`;
  }
}

// 問4 interface Figure（name: string、area(): number）と、関数 describeShape(figure: Figure) を書く。"正方形（面積 9）" の形
//     例: describeShape({ name: "正方形", area: () => 9 }) → "正方形（面積 9）"
// 型は interface で宣言してください。
// 引数と戻り値には型注釈を付けてください。
export interface Figure {
  name: string;
  area(): number;
}

export function describeShape(figure: Figure): string {
  return `${figure.name}（面積 ${figure.area()}）`;
}

// 問5 interface Priced（price: number）と、関数 totalPrice(items: readonly Priced[]) を書く
//     例: totalPrice([{ price: 100 }, { price: 50 }]) → 150
// 型は interface で宣言してください。
// 引数と戻り値には型注釈を付けてください。
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

// 問6 interface Instrument（play(): string）と、それを実装する class Bell と class Drum、関数 playAll(instruments: readonly Instrument[]): string[] を書く。Bell は "チリン"、Drum は "ドン"
//     例: playAll([new Bell(), new Drum()]) → ["チリン", "ドン"]
// 型は interface で宣言し、クラスには implements Instrument を付けてください。
// 引数と戻り値には型注釈を付けてください。
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

// 問7 interface FixedPoint（x と y、どちらも読み取り専用の数値）と、関数 origin()（{ x: 0, y: 0 } を返す）を書く
//     例: origin() → { x: 0, y: 0 }
// 型は interface で宣言してください。
// 引数と戻り値には型注釈を付けてください。
export interface FixedPoint {
  readonly x: number;
  readonly y: number;
}

export function origin(): FixedPoint {
  return { x: 0, y: 0 };
}

// 問8 interface Animal（name: string）と、それを継承した interface Dog（breed: string を足す）、関数 dogLabel(dog: Dog) を書く。"ポチ（柴）"
//     例: dogLabel({ name: "ポチ", breed: "柴" }) → "ポチ（柴）"
// 型は interface で宣言してください。
// インターフェースの継承には extends を使ってください。
// 引数と戻り値には型注釈を付けてください。
export interface Animal {
  name: string;
}

export interface Dog extends Animal {
  breed: string;
}

export function dogLabel(dog: Dog): string {
  return `${dog.name}（${dog.breed}）`;
}

// 問9 interface Logger（log(message: string): void）と、それを実装する class MemoryLogger を書く。MemoryLogger は受け取ったメッセージを lines（文字列の配列）に貯める
//     例: log("a") の後の lines → ["a"]
// 型は interface で宣言し、クラスには implements Logger を付けてください。
// 引数と戻り値には型注釈を付けてください。
export interface Logger {
  log(message: string): void;
}

export class MemoryLogger implements Logger {
  lines: string[] = [];

  log(message: string): void {
    this.lines.push(message);
  }
}

// 問10 interface KeyValueStore（get(key: string): string | undefined、set(key: string, value: string): void）と、それを実装する class MemoryStore を書く
//     例: set("a", "1") の後の get("a") → "1"
// 型は interface で宣言し、クラスには implements KeyValueStore を付けてください。
// 引数と戻り値には型注釈を付けてください。
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

// 問11 interface Vehicle（wheels: number、move(): string）と、それを実装する class Bike（wheels は 2、move は "スイスイ"）と class Car（wheels は 4、move は "ブーン"）を書く
//     例: new Car().move() → "ブーン"
// 型は interface で宣言し、クラスには implements Vehicle を付けてください。
// 引数と戻り値には型注釈を付けてください。
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

// 問12 interface Validator（validate(value: string): boolean）と、それを実装する class MinLength(min) を書く。文字数が min 以上なら true
//     例: new MinLength(3).validate("ab") → false
// 型は interface で宣言し、クラスには implements Validator を付けてください。
// 引数と戻り値には型注釈を付けてください。
export interface Validator {
  validate(value: string): boolean;
}

export class MinLength implements Validator {
  constructor(private readonly min: number) {}

  validate(value: string): boolean {
    return value.length >= this.min;
  }
}

// 問13 interface Clock（now(): number）と、それを実装する class FixedClock(time)（now は常に time を返す）、関数 elapsedSince(clock: Clock, start: number): number（now() - start）を書く
//     例: elapsedSince(new FixedClock(1500), 1000) → 500
// 型は interface で宣言し、クラスには implements Clock を付けてください。
// 引数と戻り値には型注釈を付けてください。
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

// 問14 interface PriceFormatter（format(n: number): string）と、それを実装する class YenFormatter を書く。"1,200円" の形
//     例: new YenFormatter().format(1200) → "1,200円"
// 型は interface で宣言し、クラスには implements PriceFormatter を付けてください。
// 引数と戻り値には型注釈を付けてください。
export interface PriceFormatter {
  format(n: number): string;
}

export class YenFormatter implements PriceFormatter {
  format(n: number): string {
    return `${n.toLocaleString("ja-JP")}円`;
  }
}

// 問15 interface TallyLike（count: number、increment(): void）と、関数 makeTally(): TallyLike（オブジェクトリテラルで作る。increment は count を1増やす）を書く
//     例: const t = makeTally(); t.increment(); t.count → 1
// 型は interface で宣言してください。
// 引数と戻り値には型注釈を付けてください。
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

// 問16 interface Point2D（x、y）と、それを継承した interface Point3D（z を足す）、関数 length3d(p: Point3D): number（原点からの距離。Math.hypot）を書く
//     例: length3d({ x: 1, y: 2, z: 2 }) → 3
// 型は interface で宣言してください。
// インターフェースの継承には extends を使ってください。
// 引数と戻り値には型注釈を付けてください。
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

// 問17 interface LogEntry（message: string、at: number）と、関数 latestEntry(entries: readonly LogEntry[]): LogEntry | undefined（at がいちばん大きいもの）を書く
//     例: latestEntry([{ message: "a", at: 1 }, { message: "b", at: 3 }]) → { message: "b", at: 3 }
// 型は interface で宣言してください。
// 引数と戻り値には型注釈を付けてください。
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

// 問18 interface Repository（findById(id: number): string | undefined）と、それを実装する class ArrayRepository(items: readonly string[]) を書く。id は1から数えた番号
//     例: new ArrayRepository(["a", "b"]).findById(2) → "b"
// 型は interface で宣言し、クラスには implements Repository を付けてください。
// 引数と戻り値には型注釈を付けてください。
export interface Repository {
  findById(id: number): string | undefined;
}

export class ArrayRepository implements Repository {
  constructor(private readonly items: readonly string[]) {}

  findById(id: number): string | undefined {
    return this.items[id - 1];
  }
}

// 問19 interface Discount（apply(price: number): number）と、class PercentOff(rate)（rate パーセント引き。1円未満は切り捨て）、class AmountOff(amount)（amount 円引き。0 より小さくしない）、関数 applyDiscounts(price, discounts: readonly Discount[]): number（前から順に当てはめる）を書く
//     例: applyDiscounts(1000, [new PercentOff(10), new AmountOff(100)]) → 800
// 型は interface で宣言し、クラスには implements Discount を付けてください。
// 引数と戻り値には型注釈を付けてください。
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

// 問20 interface Serializable（serialize(): string）と、それを実装する class JsonUser(name, age) を書く。serialize は JSON.stringify({ name, age }) を返す
//     例: new JsonUser("山田", 30).serialize() → '{"name":"山田","age":30}'
// 型は interface で宣言し、クラスには implements Serializable を付けてください。
// 引数と戻り値には型注釈を付けてください。
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
