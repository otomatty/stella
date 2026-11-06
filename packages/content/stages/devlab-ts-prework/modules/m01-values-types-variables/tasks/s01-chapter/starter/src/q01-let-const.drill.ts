// 01-q01 letとconst ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/let-and-const
//       https://typescriptbook.jp/reference/values-types-variables/vars-problems
//
// 次の20個の関数の中身を書いてください。引数と戻り値の型は書いてあります。
// 変数は const で宣言し、後から値を入れ直す変数だけ let にすること。var は使わない。
// 引数に値を入れ直すことはできない（ESLint の no-param-reassign）。入れ直したいときは let の変数に写してから使う。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 税込価格を返す（税率10%。税額の1円未満は切り捨て）
//     例: addTax(1000) → 1100
export function addTax(price: number): number {
  // ここに書く
}

// 問2 割り勘で1人が払う金額を返す（100円単位に切り上げ）
//     例: splitBill(10000, 3) → 3400
export function splitBill(total: number, people: number): number {
  // ここに書く
}

// 問3 分を「◯時間◯分」の文字列にする
//     例: minutesToText(125) → "2時間5分"
export function minutesToText(minutes: number): string {
  // ここに書く
}

// 問4 3つの数の平均を返す
//     例: average3(1, 2, 6) → 3
export function average3(a: number, b: number, c: number): number {
  // ここに書く
}

// 問5 1から n までの合計を返す（for 文で足していく）
//     例: sumTo(10) → 55
export function sumTo(n: number): number {
  // ここに書く
}

// 問6 n の階乗（1 × 2 × … × n）を返す。0 の階乗は 1
//     例: factorial(5) → 120
export function factorial(n: number): number {
  // ここに書く
}

// 問7 n から 1 まで数えて、最後に「発射」を付けた文字列を返す
//     例: countDown(3) → "3, 2, 1, 発射"
export function countDown(n: number): string {
  // ここに書く
}

// 問8 base の exponent 乗を返す（** や Math.pow を使わず、for 文で掛けていく）
//     例: power(2, 10) → 1024
export function power(base: number, exponent: number): number {
  // ここに書く
}

// 問9 text の中に char が何回出てくるかを返す（for-of で1文字ずつ見る）
//     例: countChar("banana", "a") → 3
export function countChar(text: string, char: string): number {
  // ここに書く
}

// 問10 文字列を逆順にして返す（for-of で1文字ずつ前に足していく）
//     例: reverseText("abc") → "cba"
export function reverseText(text: string): string {
  // ここに書く
}

// 問11 0以上の整数の、各桁の数字の合計を返す（while 文で10で割っていく）
//     例: digitSum(1234) → 10
export function digitSum(n: number): number {
  // ここに書く
}

// 問12 3の倍数なら "Fizz"、5の倍数なら "Buzz"、両方なら "FizzBuzz"、どちらでもなければ数字の文字列を返す
//     例: fizzBuzz(15) → "FizzBuzz"
export function fizzBuzz(n: number): string {
  // ここに書く
}

// 問13 元金を年利 rate パーセントで years 年預けたときの金額を返す（毎年の利息を元金に足す。最後に1円未満を四捨五入）
//     例: compound(10000, 10, 2) → 12100
export function compound(principal: number, rate: number, years: number): number {
  // ここに書く
}

// 問14 3つの数の最大値を返す（Math.max を使わず、if 文で比べる）
//     例: maxOf3(3, 9, 2) → 9
export function maxOf3(a: number, b: number, c: number): number {
  // ここに書く
}

// 問15 送料を返す。基本は500円。小計が3000円以上なら0円。会員なら小計に関係なく0円
//     例: shippingFee(2000, false) → 500
export function shippingFee(subtotal: number, isMember: boolean): number {
  // ここに書く
}

// 問16 英字の文字列に含まれる母音（a, e, i, o, u）の数を返す
//     例: countVowels("education") → 5
export function countVowels(text: string): number {
  // ここに書く
}

// 問17 n が1になるまでの手順の数を返す。偶数なら2で割り、奇数なら3倍して1を足す
//     例: collatzSteps(6) → 8
export function collatzSteps(n: number): number {
  // ここに書く
}

// 問18 2つの正の整数の最大公約数を返す（ユークリッドの互除法: 大きい方を小さい方で割った余りで置き換えていく）
//     例: gcd(12, 18) → 6
export function gcd(a: number, b: number): number {
  // ここに書く
}

// 問19 フィボナッチ数列の n 番目を返す（0番目は0、1番目は1、それ以降は前の2つの和）
//     例: fibonacci(10) → 55
export function fibonacci(n: number): number {
  // ここに書く
}

// 問20 秒を「時:分:秒」の形（それぞれ2桁）にする
//     例: secondsToClock(3723) → "01:02:03"
export function secondsToClock(seconds: number): string {
  // ここに書く
}
