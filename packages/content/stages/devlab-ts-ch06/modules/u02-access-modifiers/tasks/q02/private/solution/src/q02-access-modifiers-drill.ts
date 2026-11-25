// 問1 Account(id)。id は読み取り専用
//     例: new Account("A-1").id → "A-1"
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
export class Account {
  constructor(readonly id: string) {}
}

// 問2 Secret(value)。value は private。matches(guess) で value と同じなら true
//     例: new Secret("abc").matches("abc") → true
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// 非公開のフィールドには TypeScript の private を使ってください。
// 作った後に値を変えないフィールドには readonly を付けてください。
export class Secret {
  constructor(private readonly value: string) {}

  matches(guess: string): boolean {
    return guess === this.value;
  }
}

// 問3 HiddenCounter。count は private（初期値 0）。increment() で1増やして返す。current() で今の値を返す
//     例: increment() を2回 → current() は 2
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// 非公開のフィールドには TypeScript の private を使ってください。
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

// 問4 Password(raw)。raw は private。check(input) で同じなら true。masked() で raw と同じ文字数の "*" を返す
//     例: new Password("abcd").masked() → "****"
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// 非公開のフィールドには TypeScript の private を使ってください。
// 作った後に値を変えないフィールドには readonly を付けてください。
export class Password {
  constructor(private readonly raw: string) {}

  check(input: string): boolean {
    return input === this.raw;
  }

  masked(): string {
    return "*".repeat(this.raw.length);
  }
}

// 問5 Settings(values: { [key: string]: string })。values は private で読み取り専用。get(key) で値を返す（なければ undefined）
//     例: new Settings({ theme: "dark" }).get("theme") → "dark"
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// 非公開のフィールドには TypeScript の private を使ってください。
export class Settings {
  constructor(private readonly values: { [key: string]: string }) {}

  get(key: string): string | undefined {
    return this.values[key];
  }
}

// 問6 SerialNumber(prefix)。次の番号は private（初期値 1）。next() で "A-1"、"A-2"… を返す（prefix が "A" のとき）
//     例: new SerialNumber("A").next() → "A-1"
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// 非公開のフィールドには TypeScript の private を使ってください。
// 作った後に値を変えないフィールドには readonly を付けてください。
export class SerialNumber {
  private nextNumber = 1;

  constructor(private readonly prefix: string) {}

  next(): string {
    const value = `${this.prefix}-${this.nextNumber}`;
    this.nextNumber++;
    return value;
  }
}

// 問7 Stock。在庫 { [item: string]: number } は private（初期値 {}）。add(item, n) で増やす（何も返さない）。count(item) で数を返す（なければ 0）
//     例: add("りんご", 3) の後の count("りんご") → 3
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// 非公開のフィールドには TypeScript の private を使ってください。
export class Stock {
  private items: { [item: string]: number } = {};

  add(item: string, n: number): void {
    this.items[item] = (this.items[item] ?? 0) + n;
  }

  count(item: string): number {
    return this.items[item] ?? 0;
  }
}

// 問8 Thermostat。設定温度は private（初期値 20）。setTarget(n) で変える（10〜30 の外なら "10〜30度にしてください" の Error）。getTarget() で返す
//     例: setTarget(25) の後の getTarget() → 25
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// 非公開のフィールドには TypeScript の private を使ってください。
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

// 問9 Member(name)。name は読み取り専用。ログイン回数は private（初期値 0）。login() で1増やして返す
//     例: new Member("山田").login() → 1
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// 非公開のフィールドには TypeScript の private を使ってください。
export class Member {
  private loginCount = 0;

  constructor(readonly name: string) {}

  login(): number {
    this.loginCount++;
    return this.loginCount;
  }
}

// 問10 FixedPoint(x, y)。x と y は読み取り専用。moved(dx, dy) で動かした新しい FixedPoint を返す
//     例: new FixedPoint(1, 2).moved(3, 3) → FixedPoint(4, 5)
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
export class FixedPoint {
  constructor(
    readonly x: number,
    readonly y: number,
  ) {}

  moved(dx: number, dy: number): FixedPoint {
    return new FixedPoint(this.x + dx, this.y + dy);
  }
}

// 問11 Prepaid(initial)。残高は private。pay(n) で減らす（足りなければ "残高が足りません" の Error。何も返さない）。getBalance() で返す
//     例: new Prepaid(1000) で pay(300) → getBalance() は 700
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// 非公開のフィールドには TypeScript の private を使ってください。
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

// 問12 FrozenList(items: readonly string[])。受け取った配列のコピーを private に持つ。at(i) で i 番目（なければ undefined）、size() で数を返す
//     例: new FrozenList(["a", "b"]).at(1) → "b"
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// 非公開のフィールドには TypeScript の private を使ってください。
// 作った後に値を変えないフィールドには readonly を付けてください。
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

// 問13 Session。トークン（string | null）は private（初期値 null）。login(token) と logout()（何も返さない）。isLoggedIn() でログイン中なら true
//     例: login("t") の後の isLoggedIn() → true
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// 非公開のフィールドには TypeScript の private を使ってください。
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

// 問14 NumberCache。値の入れ物 { [key: string]: number } は private（初期値 {}）。set(key, value)（何も返さない）、get(key)（なければ undefined）、has(key)（あれば true）
//     例: set("a", 1) の後の has("a") → true
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// 非公開のフィールドには TypeScript の private を使ってください。
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

// 問15 Journal。行の配列は private（初期値 []）。write(line)（何も返さない）。lines() で行の配列のコピーを返す
//     例: write("a") の後の lines() → ["a"]
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// 非公開のフィールドには TypeScript の private を使ってください。
export class Journal {
  private entries: string[] = [];

  write(line: string): void {
    this.entries.push(line);
  }

  lines(): string[] {
    return [...this.entries];
  }
}

// 問16 Ballot。賛成と反対の票数は private（どちらも初期値 0）。yes() と no()（何も返さない）。result() で "賛成" | "反対" | "同数" を返す
//     例: yes() を2回、no() を1回 → result() は "賛成"
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// 非公開のフィールドには TypeScript の private を使ってください。
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

// 問17 Review。評価の配列は private（初期値 []）。add(n) で足す（1〜5 の整数でなければ "評価は1〜5です" の Error。何も返さない）。average() で平均を返す（なければ 0）
//     例: add(4)、add(5) の後の average() → 4.5
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// 非公開のフィールドには TypeScript の private を使ってください。
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

// 問18 Ticket(id)。id は読み取り専用。使ったかどうかは private（初期値 false）。use() で使う（使用済みなら "使用済みです" の Error。何も返さない）。isUsed()（使用済みなら true）
//     例: use() を2回 → 2回目で Error
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// 非公開のフィールドには TypeScript の private を使ってください。
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

// 問19 Tank(capacity)。capacity は読み取り専用。量は private（初期値 0）。refill(n) で足すが capacity を超えない。足した後の量を返す
//     例: new Tank(50) で refill(30)、refill(30) → 50
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// 非公開のフィールドには TypeScript の private を使ってください。
export class Tank {
  private amount = 0;

  constructor(readonly capacity: number) {}

  refill(n: number): number {
    this.amount = Math.min(this.amount + n, this.capacity);
    return this.amount;
  }
}

// 問20 動物 Animal(name) の name を protected にし、それを継承した PetDog の speak() で "ポチ: ワン" を返す。protected は、そのクラスと継承したクラスの中からだけ使える
//     例: new PetDog("ポチ").speak() → "ポチ: ワン"
// フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けてください。
// 作った後に値を変えないフィールドには readonly を付けてください。
export class Animal {
  constructor(protected readonly name: string) {}
}

export class PetDog extends Animal {
  speak(): string {
    return `${this.name}: ワン`;
  }
}
