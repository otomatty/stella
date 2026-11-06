// 03-q02 リテラル型のユニオン ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types
//       https://typescriptbook.jp/reference/values-types-variables/union
//
// 次の20問を解いてください。引数と戻り値には型注釈を付けること。
// 問1〜10 は、定義済みの型 Direction、Weekday、Plan を使う。
// 問11〜20 は、"表" | "裏" のようなリテラル型のユニオンに type で名前を付けて export し、その型を使って関数を書く。
// 文字列から型の値に変える関数（parse…）は、どれにも当てはまらなければ undefined を返す。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

export type Direction = "up" | "down" | "left" | "right";
export type Weekday = "月" | "火" | "水" | "木" | "金";
export type Plan = "free" | "pro" | "enterprise";

// 問1 右に90度回った向きを返す。up → right → down → left → up
//     例: turnRight("up") → "right"
export function turnRight() {}

// 問2 前後の空白を取り除いて小文字にし、Direction のどれかならそれを返す。違えば undefined
//     例: parseDirection(" UP ") → "up"
export function parseDirection() {}

// 問3 up か down なら true
//     例: isVertical("down") → true
export function isVertical() {}

// 問4 向きを矢印にする。up は "↑"、down は "↓"、left は "←"、right は "→"
//     例: arrowOf("left") → "←"
export function arrowOf() {}

// 問5 次の平日を返す。金の次は月
//     例: nextWeekday("金") → "月"
export function nextWeekday() {}

// 問6 文字列の最初の1文字が Weekday のどれかならそれを返す。違えば undefined
//     例: parseWeekday("水曜日") → "水"
export function parseWeekday() {}

// 問7 金なら true
//     例: isFriday("金") → true
export function isFriday() {}

// 問8 月額料金を返す。free は 0、pro は 1000、enterprise は 5000
//     例: planPrice("pro") → 1000
export function planPrice() {}

// 問9 1つ上のプランを返す。free → pro → enterprise。enterprise はそのまま
//     例: upgrade("free") → "pro"
export function upgrade() {}

// 問10 小文字にして、Plan のどれかならそれを返す。違えば undefined
//     例: parsePlan("Pro") → "pro"
export function parsePlan() {}

// 問11 型 Coin（"表" か "裏"）を定義して export し、flipCoin(coin: Coin) を書く。反対の面を返す
//     例: flipCoin("表") → "裏"
// ここに型 Coin と関数 flipCoin を書く

// 問12 型 Answer（"yes"、"no"、"maybe"）を定義して export し、parseAnswer(text: string) を書く。小文字にして Answer のどれかならそれを、違えば undefined を返す
//     例: parseAnswer("YES") → "yes"
// ここに型 Answer と関数 parseAnswer を書く

// 問13 型 Theme（"light"、"dark"、"system"）を定義して export し、resolveTheme(theme: Theme, osDark: boolean) を書く。"system" なら OS の設定（osDark が true なら "dark"）に従う。戻り値は "light" | "dark"
//     例: resolveTheme("system", true) → "dark"
// ここに型 Theme と関数 resolveTheme を書く

// 問14 型 Unit（"mm"、"cm"、"m"）を定義して export し、toMillimeters(value: number, unit: Unit) を書く。mm に直した値を返す
//     例: toMillimeters(1.5, "m") → 1500
// ここに型 Unit と関数 toMillimeters を書く

// 問15 型 Grade（"A"、"B"、"C"、"D"）を定義して export し、gradeFrom(score: number) を書く。90以上 A、70以上 B、50以上 C、それ未満 D
//     例: gradeFrom(75) → "B"
// ここに型 Grade と関数 gradeFrom を書く

// 問16 型 Rank（"gold"、"silver"、"bronze"）を定義して export し、rankPoint(rank: Rank) を書く。gold 3、silver 2、bronze 1
//     例: rankPoint("silver") → 2
// ここに型 Rank と関数 rankPoint を書く

// 問17 型 TaskStatus（"todo"、"doing"、"done"）を定義して export し、isFinished(status: TaskStatus) を書く。done なら true
//     例: isFinished("done") → true
// ここに型 TaskStatus と関数 isFinished を書く

// 問18 型 Signal（"red"、"yellow"、"green"）を定義して export し、canGo(signal: Signal) を書く。green なら true
//     例: canGo("green") → true
// ここに型 Signal と関数 canGo を書く

// 問19 型 Lang（"ja" か "en"）を定義して export し、hello(lang: Lang) を書く。ja は "こんにちは"、en は "Hello"。戻り値は "こんにちは" | "Hello"
//     例: hello("en") → "Hello"
// ここに型 Lang と関数 hello を書く

// 問20 型 Visibility（"public" か "private"）を定義して export し、canView(visibility: Visibility, isOwner: boolean) を書く。public なら誰でも、private なら持ち主だけ true
//     例: canView("private", false) → false
// ここに型 Visibility と関数 canView を書く
