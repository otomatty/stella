// 問16 「50%」の形の文字列を数値 50 にする。「%」で終わっていない、または数値にならなければ「割合ではありません: <text>」の失敗
//     例: parsePercent("50%") → { ok: true, value: 50 }
// 引数と戻り値に型注釈を付ける。
// 定義済みの Result 型を使う。

export type Result = { ok: true; value: number } | { ok: false; error: string };

export function parsePercent(text: string): Result {
  const body = text.slice(0, -1);
  const value = Number(body);
  if (!text.endsWith("%") || body === "" || Number.isNaN(value)) {
    return { ok: false, error: `割合ではありません: ${text}` };
  }
  return { ok: true, value };
}
