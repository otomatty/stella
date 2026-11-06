// 03-q05 成功と失敗を表す型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union
//
// 成功と失敗を表す型 Result は定義済みです。次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。
// 失敗を例外ではなく値で返すと、呼び出す側は result.ok で場合を分けてから value や error を使うことになる。
// 失敗のときの error の文言は、問題文に書いたとおりにする。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

export type Result = { ok: true; value: number } | { ok: false; error: string };

// 問1 value を持つ成功の Result を作る
//     例: success(3) → { ok: true, value: 3 }
export function success() {}

// 問2 error を持つ失敗の Result を作る
//     例: failure("だめ") → { ok: false, error: "だめ" }
export function failure() {}

// 問3 成功なら true
//     例: isOk({ ok: true, value: 1 }) → true
export function isOk() {}

// 問4 成功なら value、失敗なら fallback を返す
//     例: valueOr({ ok: false, error: "x" }, 0) → 0
export function valueOr() {}

// 問5 失敗なら error、成功なら fallback を返す
//     例: errorOr({ ok: false, error: "x" }, "なし") → "x"
export function errorOr() {}

// 問6 a ÷ b を返す。b が 0 なら、error が「0で割ることはできません」の失敗
//     例: safeDivide(6, 3) → { ok: true, value: 2 }
export function safeDivide() {}

// 問7 平方根を返す。負の数なら、error が「負の数です」の失敗
//     例: safeSqrt(9) → { ok: true, value: 3 }
export function safeSqrt() {}

// 問8 文字列を年齢にする。0〜150 の整数でなければ、error が「年齢ではありません: <text>」の失敗
//     例: parseAge("30") → { ok: true, value: 30 }
export function parseAge() {}

// 問9 成功なら value を2倍にした成功、失敗ならそのまま返す
//     例: doubleResult({ ok: true, value: 4 }) → { ok: true, value: 8 }
export function doubleResult() {}

// 問10 両方成功なら value を足した成功。失敗があれば、先に見つかった失敗（a、b の順）を返す
//     例: addResults({ ok: true, value: 1 }, { ok: true, value: 2 }) → { ok: true, value: 3 }
export function addResults() {}

// 問11 成功の数を返す
//     例: countOk([成功, 失敗, 成功]) → 2
export function countOk() {}

// 問12 最初に見つかった失敗の error を返す。失敗がなければ undefined
//     例: firstError([成功, { ok: false, error: "x" }]) → "x"
export function firstError() {}

// 問13 成功の value だけを合計する
//     例: sumOk([{ ok: true, value: 1 }, 失敗, { ok: true, value: 2 }]) → 3
export function sumOk() {}

// 問14 成功なら「成功: 3」、失敗なら「失敗: エラーの文」を返す
//     例: resultText({ ok: false, error: "だめ" }) → "失敗: だめ"
export function resultText() {}

// 問15 価格を確かめる。負なら「価格は0以上にしてください」、整数でなければ「価格は整数にしてください」の失敗。問題なければその価格の成功
//     例: validatePrice(-1) → { ok: false, error: "価格は0以上にしてください" }
export function validatePrice() {}

// 問16 「50%」の形の文字列を数値 50 にする。「%」で終わっていない、または数値にならなければ「割合ではありません: <text>」の失敗
//     例: parsePercent("50%") → { ok: true, value: 50 }
export function parsePercent() {}

// 問17 成功で value が min 未満なら「<min>未満です」の失敗にする。それ以外はそのまま返す
//     例: atLeast({ ok: true, value: 3 }, 5) → { ok: false, error: "5未満です" }
export function atLeast() {}

// 問18 すべて成功なら true。空の配列も true
//     例: allOk([成功, 失敗]) → false
export function allOk() {}

// 問19 すべて成功なら value の合計の成功。失敗があれば最初の失敗を返す
//     例: combineAll([{ ok: true, value: 1 }, { ok: true, value: 2 }]) → { ok: true, value: 3 }
export function combineAll() {}

// 問20 first が成功なら first、失敗なら second を返す
//     例: orElse(失敗, { ok: true, value: 2 }) → { ok: true, value: 2 }
export function orElse() {}
