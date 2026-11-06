// 03-q03 null と undefined ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/undefined-vs-null
//       https://typescriptbook.jp/reference/values-types-variables/object/optional-chaining
//
// 次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。
// null や undefined かもしれない値は、?.（オプショナルチェーン）、??、=== null、=== undefined で扱う。
// == null のような書き方は使わない（ESLint の eqeqeq）。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 文字列か undefined を受け取り、文字数を返す。undefined なら 0
//     例: lengthOrZero(undefined) → 0
export function lengthOrZero() {}

// 問2 文字列か null を受け取り、大文字にして返す。null なら空の文字列
//     例: upperOrEmpty(null) → ""
export function upperOrEmpty() {}

// 問3 数値か undefined を受け取り、undefined なら fallback を返す
//     例: orDefault(undefined, 10) → 10
export function orDefault() {}

// 問4 名前か null を受け取り、null なら「ゲスト」を返す
//     例: nameOrGuest(null) → "ゲスト"
export function nameOrGuest() {}

// 問5 文字列か undefined を受け取り、最初の1文字を text?.[0] で取り出して返す。なければ undefined
//     例: firstLetter("abc") → "a"
export function firstLetter() {}

// 問6 { address?: { city } } の city を返す。address がなければ undefined
//     例: cityOf({ address: { city: "渋谷区" } }) → "渋谷区"
export function cityOf() {}

// 問7 { address?: { city } } の city を返す。address がなければ「不明」
//     例: cityOrUnknown({}) → "不明"
export function cityOrUnknown() {}

// 問8 空の文字列なら null、それ以外はそのまま返す
//     例: emptyToNull("") → null
export function emptyToNull() {}

// 問9 target が何番目にあるかを返す。なければ null（-1 ではなく）
//     例: indexOrNull(["a", "b"], "c") → null
export function indexOrNull() {}

// 問10 文字列を Number で数値にする。NaN になるなら null
//     例: parseOrNull("abc") → null
export function parseOrNull() {}

// 問11 null か undefined なら true
//     例: isMissing(null) → true
export function isMissing() {}

// 問12 undefined でない要素の数を返す
//     例: countPresent(["a", undefined, "b"]) → 2
export function countPresent() {}

// 問13 null を飛ばして合計する
//     例: sumNonNull([1, null, 2]) → 3
export function sumNonNull() {}

// 問14 { phone?: string | null } の phone を返す。undefined でも null でも「なし」
//     例: phoneText({ phone: null }) → "なし"
export function phoneText() {}

// 問15 { manager: { name } | null } の manager の name を返す。manager が null なら「未定」
//     例: managerName({ manager: null }) → "未定"
export function managerName() {}

// 問16 null なら undefined に変える
//     例: nullToUndefined(null) → undefined
export function nullToUndefined() {}

// 問17 undefined なら null に変える
//     例: undefinedToNull(undefined) → null
export function undefinedToNull() {}

// 問18 2つとも null でなければ true
//     例: bothPresent("a", null) → false
export function bothPresent() {}

// 問19 null でないものだけを半角スペースでつなぐ
//     例: joinPresent("山田", null) → "山田"
export function joinPresent() {}

// 問20 { lastLoginAt: Date | null } を「2026-12-01」の形にする（toISOString の先頭10文字）。null なら「未ログイン」
//     例: lastLoginText({ lastLoginAt: null }) → "未ログイン"
export function lastLoginText() {}
