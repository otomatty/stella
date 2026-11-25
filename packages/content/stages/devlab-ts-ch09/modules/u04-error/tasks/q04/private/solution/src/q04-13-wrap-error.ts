// 問13 message を持つ新しい Error を作って返す。元の error は { cause: error } で持たせる
//     例: wrapError(元のエラー, "保存できません").cause → 元のエラー
// 引数と戻り値に型注釈を付けます。

export function wrapError(error: unknown, message: string): Error {
  return new Error(message, { cause: error });
}
