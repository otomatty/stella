// 問11 "2026-04-01" の形の文字列から、その日の 0時0分（ローカル時刻）の Date を作る。形が違えば Error を投げる
//     例: parseDate("2026-04-01") → 2026年4月1日 0:00
// 引数と戻り値に型注釈を付けます。
// Date では月を 0〜11（1月が 0）で数えます。

export function parseDate(text: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (match === null) {
    throw new Error(`日付の形が違います: ${text}`);
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}
