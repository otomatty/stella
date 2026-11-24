// 問10 catch で受け取った値から、メッセージを返す。Error なら message、それ以外は String(error)
//     例: messageOf(new Error("失敗")) → "失敗"
// 引数と戻り値に型注釈を付けます。
// instanceof Error で Error かどうかを確かめます。
export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
