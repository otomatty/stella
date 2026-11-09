// 06-q02 アクセス修飾子と readonly ドリル
//
// 教材: https://typescriptbook.jp/reference/object-oriented/class/access-modifiers
//       https://typescriptbook.jp/reference/object-oriented/class/readonly-modifier-in-classes
//       https://typescriptbook.jp/reference/object-oriented/class/constructor-shorthand
//
// 次の20個のクラスを書いてください。フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けること。
// 外から読んだり書き換えたりさせたくないフィールドは private、作った後に変えないフィールドは readonly にする。
// constructor(private readonly value: string) {} のように、引数に修飾子を付けると、フィールドの宣言と代入を1行で書ける（constructor shorthand）。
// TypeScript の private を使う（JavaScript の # でもテストは通る）。テストは、private にしたフィールドが外から見えないことも確かめる。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 Account(id)。id は読み取り専用
//     例: new Account("A-1").id → "A-1"
export class Account {}

// 問2 Secret(value)。value は private。matches(guess) で value と同じなら true
//     例: new Secret("abc").matches("abc") → true
export class Secret {}

// 問3 HiddenCounter。count は private（初期値 0）。increment() で1増やして返す。current() で今の値を返す
//     例: increment() を2回 → current() は 2
export class HiddenCounter {}

// 問4 Password(raw)。raw は private。check(input) で同じなら true。masked() で raw と同じ文字数の "*" を返す
//     例: new Password("abcd").masked() → "****"
export class Password {}

// 問5 Settings(values: { [key: string]: string })。values は private で読み取り専用。get(key) で値を返す（なければ undefined）
//     例: new Settings({ theme: "dark" }).get("theme") → "dark"
export class Settings {}

// 問6 SerialNumber(prefix)。次の番号は private（初期値 1）。next() で "A-1"、"A-2"… を返す（prefix が "A" のとき）
//     例: new SerialNumber("A").next() → "A-1"
export class SerialNumber {}

// 問7 Stock。在庫 { [item: string]: number } は private（初期値 {}）。add(item, n) で増やす（何も返さない）。count(item) で数を返す（なければ 0）
//     例: add("りんご", 3) の後の count("りんご") → 3
export class Stock {}

// 問8 Thermostat。設定温度は private（初期値 20）。setTarget(n) で変える（10〜30 の外なら "10〜30度にしてください" の Error）。getTarget() で返す
//     例: setTarget(25) の後の getTarget() → 25
export class Thermostat {}

// 問9 Member(name)。name は読み取り専用。ログイン回数は private（初期値 0）。login() で1増やして返す
//     例: new Member("山田").login() → 1
export class Member {}

// 問10 FixedPoint(x, y)。x と y は読み取り専用。moved(dx, dy) で動かした新しい FixedPoint を返す
//     例: new FixedPoint(1, 2).moved(3, 3) → FixedPoint(4, 5)
export class FixedPoint {}

// 問11 Prepaid(initial)。残高は private。pay(n) で減らす（足りなければ "残高が足りません" の Error。何も返さない）。getBalance() で返す
//     例: new Prepaid(1000) で pay(300) → getBalance() は 700
export class Prepaid {}

// 問12 FrozenList(items: readonly string[])。受け取った配列のコピーを private に持つ。at(i) で i 番目（なければ undefined）、size() で数を返す
//     例: new FrozenList(["a", "b"]).at(1) → "b"
export class FrozenList {}

// 問13 Session。トークン（string | null）は private（初期値 null）。login(token) と logout()（何も返さない）。isLoggedIn() でログイン中なら true
//     例: login("t") の後の isLoggedIn() → true
export class Session {}

// 問14 NumberCache。値の入れ物 { [key: string]: number } は private（初期値 {}）。set(key, value)（何も返さない）、get(key)（なければ undefined）、has(key)（あれば true）
//     例: set("a", 1) の後の has("a") → true
export class NumberCache {}

// 問15 Journal。行の配列は private（初期値 []）。write(line)（何も返さない）。lines() で行の配列のコピーを返す
//     例: write("a") の後の lines() → ["a"]
export class Journal {}

// 問16 Ballot。賛成と反対の票数は private（どちらも初期値 0）。yes() と no()（何も返さない）。result() で "賛成" | "反対" | "同数" を返す
//     例: yes() を2回、no() を1回 → result() は "賛成"
export class Ballot {}

// 問17 Review。評価の配列は private（初期値 []）。add(n) で足す（1〜5 の整数でなければ "評価は1〜5です" の Error。何も返さない）。average() で平均を返す（なければ 0）
//     例: add(4)、add(5) の後の average() → 4.5
export class Review {}

// 問18 Ticket(id)。id は読み取り専用。使ったかどうかは private（初期値 false）。use() で使う（使用済みなら "使用済みです" の Error。何も返さない）。isUsed()（使用済みなら true）
//     例: use() を2回 → 2回目で Error
export class Ticket {}

// 問19 Tank(capacity)。capacity は読み取り専用。量は private（初期値 0）。refill(n) で足すが capacity を超えない。足した後の量を返す
//     例: new Tank(50) で refill(30)、refill(30) → 50
export class Tank {}

// 問20 動物 Animal(name) の name を protected にし、それを継承した PetDog の speak() で "ポチ: ワン" を返す。protected は、そのクラスと継承したクラスの中からだけ使える
//     例: new PetDog("ポチ").speak() → "ポチ: ワン"
// ここに Animal と PetDog を書く
