// 09-q04 Error ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/error
//       https://typescriptbook.jp/reference/statements/exception
//
// 次の20問を解いてください。エラーのクラス HttpError と、それを継承した NotFoundError は定義済みです。
// 引数と戻り値には型注釈を付けること。catch で受け取る値や、引数の error の型は unknown です。
// エラーの種類は、name や message の文字列ではなく instanceof で見分ける。子のクラス（NotFoundError）は、親のクラス（HttpError）より先に確かめる。
// エラーのクラスを作るときは、extends Error で継承し、constructor の中で super(message) を呼んでから this.name を設定する。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export class NotFoundError extends HttpError {
  constructor(resource: string) {
    super(404, `${resource} が見つかりません`);
    this.name = "NotFoundError";
  }
}

// 問1 message を持つ Error を必ず投げる。戻り値の型は never
//     例: fail("失敗") → Error("失敗") を投げる
export function fail() {}

// 問2 error が Error ならその message、そうでなければ "不明なエラー" を返す
//     例: errorMessage(new Error("x")) → "x"
export function errorMessage() {}

// 問3 n が min 以上 max 以下ならそのまま返す。範囲の外なら RangeError(`${n} は ${min}〜${max} の範囲外です`) を投げる
//     例: checkRange(11, 1, 10) → RangeError("11 は 1〜10 の範囲外です") を投げる
export function checkRange() {}

// 問4 value が文字列ならそのまま返す。そうでなければ TypeError("文字列ではありません") を投げる
//     例: requireString(1) → TypeError を投げる
export function requireString() {}

// 問5 text を JSON.parse で読んで返す。JSON として読めず SyntaxError が投げられたら null を返す
//     例: parseJsonOrNull("{a:1}") → null
export function parseJsonOrNull() {}

// 問6 TypeError なら "TypeError"、RangeError なら "RangeError"、SyntaxError なら "SyntaxError"、それ以外の Error なら "Error"、Error でなければ "unknown" を返す（instanceof で見分ける）
//     例: errorKind(new RangeError("x")) → "RangeError"
export function errorKind() {}

// 問7 Error を継承したクラス ValidationError を書く。constructor(field, message) で、field（文字列）を readonly で持つ。name は "ValidationError"
//     例: new ValidationError("email", "形が違います").field → "email"
export class ValidationError {}

// 問8 Error を継承したクラス TimeoutError を書く。constructor(ms) で、ms（数値）を readonly で持つ。message は `${ms}ミリ秒でタイムアウトしました`、name は "TimeoutError"
//     例: new TimeoutError(500).message → "500ミリ秒でタイムアウトしました"
export class TimeoutError {}

// 問9 error が HttpError ならその status、そうでなければ undefined を返す
//     例: httpStatusOf(new HttpError(500, "x")) → 500
export function httpStatusOf() {}

// 問10 error が NotFoundError、または status が 404 の HttpError なら true
//     例: isNotFound(new NotFoundError("ユーザー")) → true
export function isNotFound() {}

// 問11 status が 404 なら NotFoundError("ページ")、それ以外なら HttpError(status, `HTTP ${status}`) を作って返す（投げずに返す）
//     例: toHttpError(500).message → "HTTP 500"
export function toHttpError() {}

// 問12 NotFoundError なら "見つかりません"、それ以外の HttpError なら `通信エラー（${status}）`、それ以外の Error なら message、Error でなければ "不明なエラー" を返す
//     例: statusMessage(new HttpError(503, "x")) → "通信エラー（503）"
export function statusMessage() {}

// 問13 message を持つ新しい Error を作って返す。元の error は { cause: error } で持たせる
//     例: wrapError(元のエラー, "保存できません").cause → 元のエラー
export function wrapError() {}

// 問14 error の cause をたどり、いちばん元の原因を返す（Error でないか、cause を持たないところで止める）
//     例: rootCause(c) → a（c の cause が b、b の cause が a のとき）
export function rootCause() {}

// 問15 fn() を呼んでその値を返す。fn が例外を投げたら fallback を返す
//     例: tryOr(() => JSON.parse("{"), 0) → 0
export function tryOr() {}

// 問16 fn() が値を返したら { ok: true, value }、例外を投げたら { ok: false, error } を返す。Error でないものが投げられたら、String(値) を message にした Error にする
//     例: attempt(() => 5) → { ok: true, value: 5 }
export function attempt() {}

// 問17 fns を順番にすべて呼び、投げられたエラーの message を集めた配列を返す（Error でなければ "不明なエラー"）
//     例: collectErrors([成功する関数, Error("a") を投げる関数]) → ["a"]
export function collectErrors() {}

// 問18 fn() の値を返す。fn が例外を投げても投げなくても、最後に log に "終了" を足す（finally）。例外はそのまま外に投げる
//     例: withFinally(() => 1, log) → 1。log は ["終了"]
export function withFinally() {}

// 問19 values に負の数があれば AggregateError を投げる。errors は負の数ごとの RangeError(`${n} は負の数です`) の配列、message は "負の数があります"
//     例: validateAll([1, -2]) → AggregateError を投げる
export function validateAll() {}

// 問20 error が Error なら { name, message }（name はエラーの name）、そうでなければ { name: "Unknown", message: String(error) } を返す
//     例: errorToJson(new NotFoundError("ユーザー")) → { name: "NotFoundError", message: "ユーザー が見つかりません" }
export function errorToJson() {}
