// 09-q04 Error ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/error
//       https://typescriptbook.jp/reference/statements/exception
//
// エラーのクラス HttpError と、それを継承した NotFoundError は定義済みです。
// 引数と戻り値には型注釈を付けること。catch で受け取る値や、引数の error の型は unknown です。
// エラーの種類は、name や message の文字列ではなく instanceof で見分ける。子のクラス（NotFoundError）は、親のクラス（HttpError）より先に確かめる。
// エラーのクラスを作るときは、extends Error で継承し、constructor の中で super(message) を呼んでから this.name を設定する。

// 問18 fn() の値を返す。fn が例外を投げても投げなくても、最後に log に "終了" を足す（finally）。例外はそのまま外に投げる
//     例: withFinally(() => 1, log) → 1。log は ["終了"]
export function withFinally() {}
