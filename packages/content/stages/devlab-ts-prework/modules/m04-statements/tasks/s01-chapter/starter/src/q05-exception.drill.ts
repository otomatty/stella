// 04-q05 例外処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception
//
// 次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。
// 例外を投げるときは throw new Error("メッセージ")。メッセージは問題文のとおりにする。
// JSON.parse、new URL、decodeURIComponent、BigInt、String の repeat などは、おかしな値を渡すと例外を投げる。それを try-catch で受け止める問題もある。
// catch で受け取る値の型は unknown。使う前に instanceof Error などで絞り込む。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 0 より大きければそのまま返す。そうでなければ "正の数が必要です" の Error を投げる
//     例: requirePositive(3) → 3
export function requirePositive() {}

// 問2 a ÷ b を返す。b が 0 なら "0で割ることはできません" の Error を投げる
//     例: divide(6, 3) → 2
export function divide() {}

// 問3 整数だけを表す文字列（例: "-12"）を数値にする。そうでなければ "整数ではありません: <text>" の Error を投げる（正規表現 /^-?\d+$/ を使う）
//     例: parseIntStrict("42") → 42
export function parseIntStrict() {}

// 問4 index 番目の要素を返す。範囲外なら "範囲外です: <index>" の Error を投げる
//     例: itemAt(["a", "b"], 1) → "b"
export function itemAt() {}

// 問5 JSON として読めれば true（JSON.parse を try-catch で囲む）
//     例: isValidJson('{"a":1}') → true
export function isValidJson() {}

// 問6 URL として読めれば true（new URL(text) を try-catch で囲む）
//     例: isValidUrl("https://example.com") → true
export function isValidUrl() {}

// 問7 URL のホスト名（new URL(text).hostname）を返す。URL として読めなければ空の文字列
//     例: hostOf("https://example.com/path") → "example.com"
export function hostOf() {}

// 問8 text.repeat(times) を返す。times が負などで例外が出たら空の文字列を返す
//     例: safeRepeat("ab", -1) → ""
export function safeRepeat() {}

// 問9 decodeURIComponent(text) を返す。例外が出たら fallback を返す
//     例: decodeOr("%E3%81%82", "?") → "あ"
export function decodeOr() {}

// 問10 catch で受け取った値から、メッセージを返す。Error なら message、それ以外は String(error)
//     例: messageOf(new Error("失敗")) → "失敗"
export function messageOf() {}

// 問11 Error なら name（"Error"、"RangeError" など）、それ以外は "Unknown" を返す
//     例: errorName(new RangeError("x")) → "RangeError"
export function errorName() {}

// 問12 BigInt(text) を返す。例外が出たら null を返す
//     例: toBigIntOrNull("123") → 123n
export function toBigIntOrNull() {}

// 問13 ユーザー名を確かめ、問題があれば Error を投げる。空なら "名前を入力してください"、20文字より長ければ "20文字以内にしてください"、空白を含めば "空白は使えません"。問題なければ何も返さない（戻り値は void）
//     例: validateUsername("") → Error "名前を入力してください"
export function validateUsername() {}

// 問14 0〜150 でなければ RangeError（throw new RangeError("…")）を投げる。問題なければ何も返さない
//     例: checkAge(200) → RangeError
export function checkAge() {}

// 問15 RangeError なら true
//     例: isRangeError(new RangeError("x")) → true
export function isRangeError() {}

// 問16 JSON の文字列から port（数値）を取り出す。JSON として読めないか、port が数値でなければ "port がありません" の Error を投げる
//     例: readPort('{"port":8080}') → 8080
export function readPort() {}

// 問17 JSON として読めない文字列の数を返す
//     例: countInvalidJson(["1", "{", "[]", "x"]) → 2
export function countInvalidJson() {}

// 問18 JSON.parse(text) の結果を返す。読めなければ、元のエラーを cause に入れて「設定を読めません」の Error を投げる（new Error("設定を読めません", { cause: error })）
//     例: loadSettings("{") → Error "設定を読めません"
export function loadSettings() {}

// 問19 JSON として読めれば true、読めなければ false を返す。どちらの場合も、finally で log の末尾に "checked" を足す
//     例: checkWithLog([], "1") → true（log は ["checked"]）
export function checkWithLog() {}

// 問20 前後の空白を取り除いた文字列を返す。空になるなら "空です" の Error を投げる
//     例: requireText("  a ") → "a"
export function requireText() {}
