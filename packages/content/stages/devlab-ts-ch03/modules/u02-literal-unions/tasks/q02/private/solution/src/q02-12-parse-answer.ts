// 問12 型 Answer（"yes"、"no"、"maybe"）を定義して export し、parseAnswer(text: string) を書く。小文字にして Answer のどれかならそれを、違えば undefined を返す
//     例: parseAnswer("YES") → "yes"
// 引数と戻り値に型注釈を付ける。
// type と | を使い、リテラル型のユニオンを定義する。

export type Answer = "yes" | "no" | "maybe";

export function parseAnswer(text: string): Answer | undefined {
  const value = text.toLowerCase();
  if (value === "yes" || value === "no" || value === "maybe") {
    return value;
  }
  return undefined;
}
