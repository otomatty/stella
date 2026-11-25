// 問14 成功なら「成功: 3」、失敗なら「失敗: エラーの文」を返す
//     例: resultText({ ok: false, error: "だめ" }) → "失敗: だめ"
// 引数と戻り値に型注釈を付ける。
// 定義済みの Result 型を使う。
// ok で成功か失敗かを見分ける。

export type Result = { ok: true; value: number } | { ok: false; error: string };

export function resultText(result: Result): string {
  return result.ok ? `成功: ${result.value}` : `失敗: ${result.error}`;
}
