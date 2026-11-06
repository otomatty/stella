// 02-q07 構造的型付け ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/structural-subtyping
//
// Cat、Dog、Robot など、いくつかの型は定義済みです。次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。
// 引数の型には、関数が本当に使うプロパティだけを書く（例: 名前しか使わないなら { name: string }）。
// そうすると、名前の違う型でも、そのプロパティを持っていれば渡せる。これが構造的型付け。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

export type Cat = { name: string; age: number; meow: string };
export type Dog = { name: string; age: number; breed: string };
export type Robot = { name: string; version: number };
export type Box = { width: number; height: number; depth: number };
export type Paper = { width: number; height: number };
export type Product = { name: string; price: number; stock: number };
export type Service = { name: string; price: number; hours: number };

// 問1 name を返す。引数の型は { name: string }。Cat でも Robot でも渡せる
//     例: nameOf(ミケ) → "ミケ"
export function nameOf() {}

// 問2 name の文字数を返す
//     例: nameLength(ポチ) → 2
export function nameLength() {}

// 問3 来年の年齢を返す。Cat でも Dog でも渡せる
//     例: ageNextYear(ミケ) → 4
export function ageNextYear() {}

// 問4 age が years より大きければ true
//     例: isOlderThan(ポチ, 3) → true
export function isOlderThan() {}

// 問5 width × height を返す。Box でも Paper でも渡せる
//     例: faceArea(A4の紙) → 62370
export function faceArea() {}

// 問6 width と height が同じなら true
//     例: isSquareShape({ width: 5, height: 5 }) → true
export function isSquareShape() {}

// 問7 税込価格（10%。1円未満は切り捨て）を返す。Product でも Service でも渡せる
//     例: priceWithTax(りんご) → 165
export function priceWithTax() {}

// 問8 price が 0 なら true
//     例: isFree(無料相談) → true
export function isFree() {}

// 問9 「名前: 価格円」を返す。Product でも Service でも渡せる
//     例: priceLabel(りんご) → "りんご: 150円"
export function priceLabel() {}

// 問10 「名前（年齢歳）」を返す。Cat でも Dog でも渡せる
//     例: introduce(ミケ) → "ミケ（3歳）"
export function introduce() {}

// 問11 年上の方の名前を返す。同じ年齢なら a の名前
//     例: olderName(ミケ, ポチ) → "ポチ"
export function olderName() {}

// 問12 price の合計を返す。Product と Service が混ざった配列も渡せる。引数は readonly { price: number }[]
//     例: totalPrice([りんご, 相談]) → 3150
export function totalPrice() {}

// 問13 name を並べた配列を返す。Cat、Dog、Robot が混ざった配列も渡せる
//     例: namesOf([ミケ, ポチ, R2]) → ["ミケ", "ポチ", "R2"]
export function namesOf() {}

// 問14 周りの長さ（(width + height) × 2）を返す
//     例: perimeterOf({ width: 3, height: 4 }) → 14
export function perimeterOf() {}

// 問15 横長なら "横長"、縦長なら "縦長"、同じなら "正方形" を返す
//     例: orientation(A4の紙) → "縦長"
export function orientation() {}

// 問16 name が max 文字より長ければ true
//     例: hasLongName(R2, 3) → false
export function hasLongName() {}

// 問17 age の平均を返す。空の配列なら 0
//     例: averageAge([ミケ, ポチ]) → 4
export function averageAge() {}

// 問18 いちばん安いものの name を返す。同じ価格なら先に出てきた方。空の配列なら Error を投げる
//     例: cheapestName([相談, りんご]) → "りんご"
export function cheapestName() {}

// 問19 width × height の合計を返す。Box と Paper が混ざった配列も渡せる
//     例: sumArea([{ width: 2, height: 3 }, { width: 1, height: 1 }]) → 7
export function sumArea() {}

// 問20 「width × height」の文字列を返す
//     例: sizeText(A4の紙) → "210 × 297"
export function sizeText() {}
