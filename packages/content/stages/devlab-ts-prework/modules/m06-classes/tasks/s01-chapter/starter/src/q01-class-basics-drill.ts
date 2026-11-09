// 06-q01 クラスの基本 ドリル
//
// 教材: https://typescriptbook.jp/reference/object-oriented/class/constructor
//       https://typescriptbook.jp/reference/object-oriented/class/fields
//       https://typescriptbook.jp/reference/object-oriented/class/methods
//       https://typescriptbook.jp/reference/object-oriented/class/field-initializers
//
// 次の20個のクラスを書いてください。フィールド、コンストラクタの引数、メソッドの引数と戻り値には型注釈を付けること。
// フィールドは、宣言して constructor の中で this.x = x; と入れるか、count = 0 のように初期値を書く（フィールドの初期化子）。
// アクセス修飾子（private など）は q02 で扱う。ここではすべて public（何も付けない）でよい。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 Point(x, y)。フィールド x と y。label() で "(1, 2)" を返す
//     例: new Point(1, 2).label() → "(1, 2)"
export class Point {}

// 問2 Rect(width, height)。area() で面積を返す
//     例: new Rect(3, 4).area() → 12
export class Rect {}

// 問3 Circle(radius)。area() で面積、circumference() で円周（2 × Math.PI × 半径）を返す
//     例: new Circle(1).circumference() → 6.28…
export class Circle {}

// 問4 Tally。フィールド count の初期値は 0。increment() で1増やし、増やした後の値を返す
//     例: new Tally().increment() → 1
export class Tally {}

// 問5 Person(name, age)。greet() で「こんにちは、山田です（30歳）」を返す
//     例: new Person("山田", 30).greet() → "こんにちは、山田です（30歳）"
export class Person {}

// 問6 Book(title, price)。priceWithTax() で税込価格（10%。1円未満は切り捨て）を返す
//     例: new Book("入門", 1980).priceWithTax() → 2178
export class Book {}

// 問7 Stopwatch。フィールド seconds の初期値は 0。tick() で1秒進める（何も返さない）。text() で "00:05" の形（分:秒、どちらも2桁）を返す
//     例: 5回 tick() した後の text() → "00:05"
export class Stopwatch {}

// 問8 Purse(money)。spend(amount) で、足りれば money を減らして true、足りなければ何もせず false を返す
//     例: new Purse(500).spend(800) → false
export class Purse {}

// 問9 NumberStack。フィールド items（数値の配列、初期値は []）。push(n) で積む（何も返さない）。pop() で最後に積んだものを取り出して返す（空なら undefined）。size() で数を返す
//     例: push(1)、push(2) の後の pop() → 2
export class NumberStack {}

// 問10 TextQueue。フィールド items（文字列の配列、初期値は []）。enqueue(text) で末尾に足す（何も返さない）。dequeue() で先頭を取り出して返す（空なら undefined）
//     例: enqueue("a")、enqueue("b") の後の dequeue() → "a"
export class TextQueue {}

// 問11 Thermometer(celsius)。toFahrenheit() で華氏（摂氏 × 9 ÷ 5 + 32）を返す
//     例: new Thermometer(100).toFahrenheit() → 212
export class Thermometer {}

// 問12 Score。フィールド points の初期値は 0。add(n) で足す（何も返さない）。reset() で 0 に戻す（何も返さない）
//     例: add(10)、add(5) の後の points → 15
export class Score {}

// 問13 Dice(faces)。isValid(n) で、n が 1 以上 faces 以下の整数なら true
//     例: new Dice(6).isValid(7) → false
export class Dice {}

// 問14 Cart。フィールド items（{ name: string; price: number } の配列、初期値は []）。add(name, price) で足す（何も返さない）。total() で合計金額を返す
//     例: add("りんご", 150)、add("みかん", 80) の後の total() → 230
export class Cart {}

// 問15 TextBuffer。フィールド text の初期値は ""。append(s) で末尾に足す（何も返さない）。clear() で空にする。length() で文字数を返す
//     例: append("ab")、append("c") の後の length() → 3
export class TextBuffer {}

// 問16 NumberRange(start, end)。includes(n) で start 以上 end 以下なら true。size() で含まれる整数の個数（end - start + 1）を返す
//     例: new NumberRange(3, 7).size() → 5
export class NumberRange {}

// 問17 Money(amount, currency)。add(other) で、同じ通貨なら合計した新しい Money を返す。通貨が違えば "通貨が違います" の Error。format() で "1,200円" の形（金額 + 通貨）を返す
//     例: new Money(1000, "円").add(new Money(200, "円")).format() → "1,200円"
export class Money {}

// 問18 Vector(x, y)。plus(other) で足した新しい Vector を返す。length() で長さ（Math.hypot）を返す
//     例: new Vector(1, 2).plus(new Vector(2, 2)).length() → 5
export class Vector {}

// 問19 Lamp。フィールド on の初期値は false。toggle() で on を反転し、反転した後の値を返す
//     例: new Lamp().toggle() → true
export class Lamp {}

// 問20 Greeter(greeting)。greet(name) で「greeting、◯◯さん」を返す
//     例: new Greeter("おはよう").greet("山田") → "おはよう、山田さん"
export class Greeter {}
