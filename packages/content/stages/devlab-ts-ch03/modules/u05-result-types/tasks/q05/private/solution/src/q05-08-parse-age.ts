// 問8 文字列を年齢にする。0〜150 の整数でなければ、error が「年齢ではありません: <text>」の失敗
//     例: parseAge("30") → { ok: true, value: 30 }
// 引数と戻り値に型注釈を付ける。
// 定義済みの Result 型を使う。

export type Result = { ok: true; value: number } | { ok: false; error: string };

export function parseAge(text: string): Result {
  const age = Number(text);
  if (text.trim() === "" || !Number.isInteger(age) || age < 0 || age > 150) {
    return { ok: false, error: `年齢ではありません: ${text}` };
  }
  return { ok: true, value: age };
}
