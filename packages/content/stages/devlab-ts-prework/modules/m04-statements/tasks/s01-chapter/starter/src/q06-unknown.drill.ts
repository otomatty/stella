// 04-q06 unknown型と型の絞り込み ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/unknown
//       https://typescriptbook.jp/reference/statements/control-flow-analysis-and-type-guard
//
// 次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。
// unknown の値は、そのままでは使えない。typeof、instanceof、Array.isArray、=== null、"name" in value などで型を絞り込んでから使う。
// any は使わない。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 文字列なら true
//     例: isText("a") → true
export function isText() {}

// 問2 文字列か配列なら length、それ以外は 0
//     例: lengthOf([1, 2, 3]) → 3
export function lengthOf() {}

// 問3 数値ならそのまま、それ以外は 0
//     例: numberOrZero("5") → 0
export function numberOrZero() {}

// 問4 typeof の結果を返す。ただし null は "null"、配列は "array" にする
//     例: kindOf([]) → "array"
export function kindOf() {}

// 問5 文字列はそのまま、数値と真偽値は String で文字列に、null は "null"、undefined は "undefined"、それ以外は "[object]"
//     例: toText(true) → "true"
export function toText() {}

// 問6 2つとも数値なら足した数、そうでなければ null
//     例: addIfNumbers(1, "2") → null
export function addIfNumbers() {}

// 問7 Date なら true（instanceof を使う）
//     例: isDateValue(new Date()) → true
export function isDateValue() {}

// 問8 Date なら「2026-12-01」（toISOString の先頭10文字）、それ以外は "日付ではありません"
//     例: dateText(new Date("2026-12-01T09:00:00Z")) → "2026-12-01"
export function dateText() {}

// 問9 文字列の要素の数を返す
//     例: countStrings(["a", 1, "b", null]) → 2
export function countStrings() {}

// 問10 数値の要素だけを集めた配列を返す（for-of と push）
//     例: onlyNumbers([1, "2", 3]) → [1, 3]
export function onlyNumbers() {}

// 問11 最初の文字列の要素を返す。なければ undefined
//     例: firstText([1, "a", "b"]) → "a"
export function firstText() {}

// 問12 null でないオブジェクトで、name プロパティが文字列なら true（"name" in value を使う）
//     例: hasName({ name: "山田" }) → true
export function hasName() {}

// 問13 name プロパティが文字列ならそれを、そうでなければ "不明" を返す
//     例: nameOrUnknown({ name: "山田", age: 30 }) → "山田"
export function nameOrUnknown() {}

// 問14 配列で、すべての要素が数値なら true
//     例: isNumberList([1, 2]) → true
export function isNumberList() {}

// 問15 真偽値ならそのまま、文字列 "true" なら true、それ以外は false
//     例: toBool("true") → true
export function toBool() {}

// 問16 Error なら message、文字列ならそのまま、それ以外は "エラー"
//     例: problemText(new Error("失敗")) → "失敗"
export function problemText() {}

// 問17 配列で、最初の要素が文字列なら、その文字数を返す。それ以外は 0
//     例: firstItemLength(["abc", 1]) → 3
export function firstItemLength() {}

// 問18 オブジェクトで port プロパティが数値ならそれを、そうでなければ 3000 を返す
//     例: portOf({ port: 8080 }) → 8080
export function portOf() {}

// 問19 null でも配列でもないオブジェクトなら true
//     例: isPlainObject({}) → true
export function isPlainObject() {}

// 問20 JSON.parse(text) の結果が数値ならそれを、そうでなければ null を返す。JSON として読めなくても null
//     例: jsonNumber("42") → 42
export function jsonNumber() {}
