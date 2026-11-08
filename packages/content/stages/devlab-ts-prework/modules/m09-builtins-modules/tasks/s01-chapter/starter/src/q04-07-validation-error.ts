// 09-q04 Error ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/error
//       https://typescriptbook.jp/reference/statements/exception
//
// エラーのクラス HttpError と、それを継承した NotFoundError は定義済みです。
// 引数と戻り値には型注釈を付けること。catch で受け取る値や、引数の error の型は unknown です。
// エラーの種類は、name や message の文字列ではなく instanceof で見分ける。子のクラス（NotFoundError）は、親のクラス（HttpError）より先に確かめる。
// エラーのクラスを作るときは、extends Error で継承し、constructor の中で super(message) を呼んでから this.name を設定する。

// 問7 Error を継承したクラス ValidationError を書く。constructor(field, message) で、field（文字列）を readonly で持つ。name は "ValidationError"
//     例: new ValidationError("email", "形が違います").field → "email"
export class ValidationError {}
