// 09-q04 Error ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/error
//       https://typescriptbook.jp/reference/statements/exception
//
// エラーのクラス HttpError と、それを継承した NotFoundError は定義済みです。
// 引数と戻り値には型注釈を付けること。catch で受け取る値や、引数の error の型は unknown です。
// エラーの種類は、name や message の文字列ではなく instanceof で見分ける。子のクラス（NotFoundError）は、親のクラス（HttpError）より先に確かめる。
// エラーのクラスを作るときは、extends Error で継承し、constructor の中で super(message) を呼んでから this.name を設定する。

// 問8 Error を継承したクラス TimeoutError を書く。constructor(ms) で、ms（数値）を readonly で持つ。message は `${ms}ミリ秒でタイムアウトしました`、name は "TimeoutError"
//     例: new TimeoutError(500).message → "500ミリ秒でタイムアウトしました"
export class TimeoutError {}
