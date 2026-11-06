// 05-q02 引数と戻り値の型、void ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-parameters
//       https://typescriptbook.jp/reference/functions/void-type
//       https://typescriptbook.jp/reference/functions/pass-by-value
//
// 次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。
// 何も返さない関数の戻り値の型は void。引数で受け取った配列やオブジェクトを書き換える関数は、引数を readonly にしない。
// 配列やオブジェクトは参照渡しなので、関数の中で書き換えると、呼び出し側の値も変わる。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 lines の末尾に message を足す。何も返さない
//     例: logTo(lines, "start") → lines が ["start"] になる
export function logTo() {}

// 問2 target の末尾に values をすべて足す。何も返さない
//     例: addAll(target, [1, 2]) → target の末尾に 1, 2 が足される
export function addAll() {}

// 問3 配列を空にする（items.length = 0）。何も返さない
//     例: clearAll(items) → items が [] になる
export function clearAll() {}

// 問4 user の name を書き換える。何も返さない
//     例: rename(user, "佐藤") → user.name が "佐藤" になる
export function rename() {}

// 問5 すべての要素を1増やす（配列そのものを書き換える）。何も返さない
//     例: incrementAll(counts) → [1, 2] が [2, 3] になる
export function incrementAll() {}

// 問6 counter の count を 0 にする。何も返さない
//     例: resetCounter(counter) → counter.count が 0 になる
export function resetCounter() {}

// 問7 flags の key の値を反転する。key がなければ true にする。何も返さない
//     例: toggleFlag(flags, "dark") → flags.dark が反転する
export function toggleFlag() {}

// 問8 items の i 番目と j 番目を入れ替える（配列そのものを書き換える）。範囲外なら Error を投げる。何も返さない
//     例: swapInPlace(items, 0, 2) → ["a", "b", "c"] が ["c", "b", "a"] になる
export function swapInPlace() {}

// 問9 item が items になければ末尾に足して true、すでにあれば何もせず false を返す
//     例: pushUnique(["a"], "b") → true
export function pushUnique() {}

// 問10 value を min 以上 max 以下に収める
//     例: clampValue(15, 0, 10) → 10
export function clampValue() {}

// 問11 1〜65535 の整数の文字列ならその数値、そうでなければ undefined を返す
//     例: parsePort("8080") → 8080
export function parsePort() {}

// 問12 バイト数を、1024 以上なら「1.5 KB」、1024 × 1024 以上なら「2.0 MB」、それ未満なら「512 B」の形にする（KB と MB は小数第1位まで）
//     例: formatBytes(1536) → "1.5 KB"
export function formatBytes() {}

// 問13 合計と平均を { sum, average } で返す。空の配列なら両方 0
//     例: sumAndAverage([1, 2, 3]) → { sum: 6, average: 2 }
export function sumAndAverage() {}

// 問14 引数を受け取らず、何もしない関数（中身は空でよいが、ESLint の no-empty-function に引っかからないよう、中にコメントを1行書く）
//     例: doNothing() → undefined
export function doNothing() {}

// 問15 それぞれの名前に「さん、こんにちは」を付けた配列を返す
//     例: greetAll(["山田", "佐藤"]) → ["山田さん、こんにちは", "佐藤さん、こんにちは"]
export function greetAll() {}

// 問16 { name, age } を「山田（30歳）」にする
//     例: describeUser({ name: "山田", age: 30 }) → "山田（30歳）"
export function describeUser() {}

// 問17 文字列と数値が混ざった配列から、数値だけを集める
//     例: pickNumbers([1, "a", 2]) → [1, 2]
export function pickNumbers() {}

// 問18 ミリ秒を「1.5秒」の形にする（小数第1位まで）
//     例: secondsText(1500) → "1.5秒"
export function secondsText() {}

// 問19 最初の要素を返す。空の配列なら fallback
//     例: firstOr([], "なし") → "なし"
export function firstOr() {}

// 問20 オブジェクトの値の合計を返す
//     例: sumValues({ a: 1, b: 2 }) → 3
export function sumValues() {}
