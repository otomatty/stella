// 09-q04 Error
//
// 教材: https://typescriptbook.jp/reference/builtin-api/error
//       https://typescriptbook.jp/reference/statements/exception
//
// 問題
// 入力のチェックで使うエラーのクラスと、チェックの関数を書いてください。
//
// 1. クラス ValidationError
//    Error を継承する（extends Error）。constructor(field, message) で、
//    どの項目のエラーかを表す field（文字列）を readonly で持つ。name は "ValidationError" にする
//
// 2. validateEmail(email)
//    "@" をちょうど1つ含み、"@" の前と後ろが空でなければ email をそのまま返す。
//    そうでなければ ValidationError("email", "メールアドレスの形が違います") を投げる
//
// 3. validateAge(age)
//    age の型は unknown。0 以上 150 以下の整数ならその数を返す。
//    そうでなければ ValidationError("age", "年齢は0〜150の整数にしてください") を投げる
//
// 4. validateUser(input)
//    input は { email: string; age: unknown }。validateEmail と validateAge の両方を試し、
//    どちらも通れば { ok: true, user: { email, age } } を返す。
//    通らなければ { ok: false, errors: 投げられた ValidationError の配列 } を返す（email、age の順）。
//    ValidationError 以外のエラーが投げられたときは、そのまま投げ直す
//
// 5. describeError(error)
//    error の型は unknown。ValidationError なら "email: メールアドレスの形が違います" のように `${field}: ${message}`、
//    それ以外の Error なら `エラー: ${message}`、Error でなければ "不明なエラー" を返す
//
// 説明すること（答えは、この下に // のコメントで書く）
// - describeError で、ValidationError かどうかを Error かどうかより先に確かめる必要があるのはなぜか

export type User = { email: string; age: number };
export type ValidationResult = { ok: true; user: User } | { ok: false; errors: ValidationError[] };

export class ValidationError {}

export function validateEmail() {}

export function validateAge() {}

export function validateUser() {}

export function describeError() {}
