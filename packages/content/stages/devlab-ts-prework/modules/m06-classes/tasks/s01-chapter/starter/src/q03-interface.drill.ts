// 06-q03 インターフェース ドリル
//
// 教材: https://typescriptbook.jp/reference/object-oriented/interface/implementing-interfaces
//       https://typescriptbook.jp/reference/object-oriented/interface/interface-inheritance
//       https://typescriptbook.jp/reference/object-oriented/interface/interface-vs-type-alias
//
// 次の20問を解いてください。インターフェースは interface Named { name: string } のように書き、export する。
// クラスがインターフェースの形を満たすことは、class Cat implements Named { … } で示す。
// インターフェースは、クラスだけでなく、オブジェクトや関数の引数の型としても使える。引数と戻り値には型注釈を付けること。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 interface Named（name: string）と、それを実装する class Cat(name) を書く。Cat の meow() は "ミケ: ニャー" を返す
//     例: new Cat("ミケ").meow() → "ミケ: ニャー"
// ここに Named と Cat を書く

// 問2 interface HasArea（area(): number）と、それを実装する class Square(size) を書く
//     例: new Square(3).area() → 9
// ここに HasArea と Square を書く

// 問3 interface Greeting（greet(name: string): string）と、それを実装する class JapaneseGreeting を書く。greet は "こんにちは、◯◯さん"
//     例: new JapaneseGreeting().greet("山田") → "こんにちは、山田さん"
// ここに Greeting と JapaneseGreeting を書く

// 問4 interface Figure（name: string、area(): number）と、関数 describeShape(figure: Figure) を書く。"正方形（面積 9）" の形
//     例: describeShape({ name: "正方形", area: () => 9 }) → "正方形（面積 9）"
// ここに Figure と describeShape を書く

// 問5 interface Priced（price: number）と、関数 totalPrice(items: readonly Priced[]) を書く
//     例: totalPrice([{ price: 100 }, { price: 50 }]) → 150
// ここに Priced と totalPrice を書く

// 問6 interface Instrument（play(): string）と、それを実装する class Bell と class Drum、関数 playAll(instruments: readonly Instrument[]): string[] を書く。Bell は "チリン"、Drum は "ドン"
//     例: playAll([new Bell(), new Drum()]) → ["チリン", "ドン"]
// ここに Instrument、Bell、Drum、playAll を書く

// 問7 interface FixedPoint（x と y、どちらも読み取り専用の数値）と、関数 origin()（{ x: 0, y: 0 } を返す）を書く
//     例: origin() → { x: 0, y: 0 }
// ここに FixedPoint と origin を書く

// 問8 interface Animal（name: string）と、それを継承した interface Dog（breed: string を足す）、関数 dogLabel(dog: Dog) を書く。"ポチ（柴）"
//     例: dogLabel({ name: "ポチ", breed: "柴" }) → "ポチ（柴）"
// ここに Animal、Dog、dogLabel を書く

// 問9 interface Logger（log(message: string): void）と、それを実装する class MemoryLogger を書く。MemoryLogger は受け取ったメッセージを lines（文字列の配列）に貯める
//     例: log("a") の後の lines → ["a"]
// ここに Logger と MemoryLogger を書く

// 問10 interface KeyValueStore（get(key: string): string | undefined、set(key: string, value: string): void）と、それを実装する class MemoryStore を書く
//     例: set("a", "1") の後の get("a") → "1"
// ここに KeyValueStore と MemoryStore を書く

// 問11 interface Vehicle（wheels: number、move(): string）と、それを実装する class Bike（wheels は 2、move は "スイスイ"）と class Car（wheels は 4、move は "ブーン"）を書く
//     例: new Car().move() → "ブーン"
// ここに Vehicle、Bike、Car を書く

// 問12 interface Validator（validate(value: string): boolean）と、それを実装する class MinLength(min) を書く。文字数が min 以上なら true
//     例: new MinLength(3).validate("ab") → false
// ここに Validator と MinLength を書く

// 問13 interface Clock（now(): number）と、それを実装する class FixedClock(time)（now は常に time を返す）、関数 elapsedSince(clock: Clock, start: number): number（now() - start）を書く
//     例: elapsedSince(new FixedClock(1500), 1000) → 500
// ここに Clock、FixedClock、elapsedSince を書く

// 問14 interface PriceFormatter（format(n: number): string）と、それを実装する class YenFormatter を書く。"1,200円" の形
//     例: new YenFormatter().format(1200) → "1,200円"
// ここに PriceFormatter と YenFormatter を書く

// 問15 interface TallyLike（count: number、increment(): void）と、関数 makeTally(): TallyLike（オブジェクトリテラルで作る。increment は count を1増やす）を書く
//     例: const t = makeTally(); t.increment(); t.count → 1
// ここに TallyLike と makeTally を書く

// 問16 interface Point2D（x、y）と、それを継承した interface Point3D（z を足す）、関数 length3d(p: Point3D): number（原点からの距離。Math.hypot）を書く
//     例: length3d({ x: 1, y: 2, z: 2 }) → 3
// ここに Point2D、Point3D、length3d を書く

// 問17 interface LogEntry（message: string、at: number）と、関数 latestEntry(entries: readonly LogEntry[]): LogEntry | undefined（at がいちばん大きいもの）を書く
//     例: latestEntry([{ message: "a", at: 1 }, { message: "b", at: 3 }]) → { message: "b", at: 3 }
// ここに LogEntry と latestEntry を書く

// 問18 interface Repository（findById(id: number): string | undefined）と、それを実装する class ArrayRepository(items: readonly string[]) を書く。id は1から数えた番号
//     例: new ArrayRepository(["a", "b"]).findById(2) → "b"
// ここに Repository と ArrayRepository を書く

// 問19 interface Discount（apply(price: number): number）と、class PercentOff(rate)（rate パーセント引き。1円未満は切り捨て）、class AmountOff(amount)（amount 円引き。0 より小さくしない）、関数 applyDiscounts(price, discounts: readonly Discount[]): number（前から順に当てはめる）を書く
//     例: applyDiscounts(1000, [new PercentOff(10), new AmountOff(100)]) → 800
// ここに Discount、PercentOff、AmountOff、applyDiscounts を書く

// 問20 interface Serializable（serialize(): string）と、それを実装する class JsonUser(name, age) を書く。serialize は JSON.stringify({ name, age }) を返す
//     例: new JsonUser("山田", 30).serialize() → '{"name":"山田","age":30}'
// ここに Serializable と JsonUser を書く
