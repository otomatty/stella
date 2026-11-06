// 03-q01 型エイリアスとユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-alias
//       https://typescriptbook.jp/reference/values-types-variables/union
//
// 次の20問を解いてください。引数と戻り値には型注釈を付けること。
// 問1〜9 は、引数に string | number のようなユニオン型を直接書く。
// 問10〜20 は、type でユニオン型に名前を付けて export し、その型を使って関数を書く。
// ユニオン型の値は、typeof v === "number" や v === "欠席" で場合を分けてから使う（絞り込み）。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 文字列か数値を受け取り、文字列にして返す
//     例: toId(42) → "42"
export function toId() {}

// 問2 文字列か数値を受け取り、文字列にしたときの文字数を返す
//     例: idLength(12345) → 5
export function idLength() {}

// 問3 数値なら小数第2位までの文字列（toFixed(2)）、文字列ならそのまま返す
//     例: formatValue(3.14159) → "3.14"
export function formatValue() {}

// 問4 数値なら2倍、文字列なら2回つなげたものを返す
//     例: doubleValue("ab") → "abab"
export function doubleValue() {}

// 問5 数値なら true
//     例: isNumberValue(1) → true
export function isNumberValue() {}

// 問6 数値ならそのまま、文字列なら Number で数値にして返す
//     例: toNumberValue("12") → 12
export function toNumberValue() {}

// 問7 文字列なら "文字列"、数値なら "数値"、真偽値なら "真偽値" を返す
//     例: typeLabel(true) → "真偽値"
export function typeLabel() {}

// 問8 文字列なら文字数、数値ならその数を返す
//     例: sizeOf("abc") → 3
export function sizeOf() {}

// 問9 文字列か数値を、width 桁になるように前を0で埋めた文字列にする
//     例: padValue(7, 3) → "007"
export function padValue() {}

// 問10 型 Score（数値か "欠席"）を定義して export し、scoreText(score: Score) を書く。数値なら「80点」、"欠席" ならそのまま
//     例: scoreText(80) → "80点"
// ここに型 Score と関数 scoreText を書く

// 問11 型 Price（数値か "非売品"）を定義して export し、priceText(price: Price) を書く。数値なら「1,200円」、"非売品" ならそのまま
//     例: priceText(1200) → "1,200円"
// ここに型 Price と関数 priceText を書く

// 問12 型 Reply（真偽値か "未回答"）を定義して export し、answerText(reply: Reply) を書く。true は "はい"、false は "いいえ"、"未回答" はそのまま
//     例: answerText(false) → "いいえ"
// ここに型 Reply と関数 answerText を書く

// 問13 型 Width（数値か "auto"）を定義して export し、widthCss(width: Width) を書く。数値なら「100px」、"auto" ならそのまま
//     例: widthCss(100) → "100px"
// ここに型 Width と関数 widthCss を書く

// 問14 型 Limit（数値か "無制限"）を定義して export し、isWithinLimit(value: number, limit: Limit) を書く。"無制限" なら常に true、数値なら value が limit 以下で true
//     例: isWithinLimit(5, 3) → false
// ここに型 Limit と関数 isWithinLimit を書く

// 問15 型 Port（数値か文字列）を定義して export し、portNumber(port: Port) を書く。文字列なら Number.parseInt で数値にする
//     例: portNumber("8080") → 8080
// ここに型 Port と関数 portNumber を書く

// 問16 型 Delay（秒数の数値か "now"）を定義して export し、delayMs(delay: Delay) を書く。ミリ秒にして返す。"now" は 0
//     例: delayMs(1.5) → 1500
// ここに型 Delay と関数 delayMs を書く

// 問17 型 Level（1、2、3、"max" のどれか）を定義して export し、levelValue(level: Level) を書く。"max" は 10、それ以外はその数
//     例: levelValue("max") → 10
// ここに型 Level と関数 levelValue を書く

// 問18 型 UserId（文字列か数値）を定義して export し、sameUser(a: UserId, b: UserId) を書く。文字列にしたときに同じなら true
//     例: sameUser(1, "1") → true
// ここに型 UserId と関数 sameUser を書く

// 問19 型 FontSize（数値か "S"、"M"、"L"）を定義して export し、fontPx(size: FontSize) を書く。S は 12、M は 16、L は 20、数値はそのまま
//     例: fontPx("M") → 16
// ここに型 FontSize と関数 fontPx を書く

// 問20 型 Temperature（数値か "不明"）を定義して export し、tempText(temp: Temperature) を書く。数値なら「25℃」、"不明" ならそのまま
//     例: tempText(25) → "25℃"
// ここに型 Temperature と関数 tempText を書く
