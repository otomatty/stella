// 問15 max 文字を超えたら、max 文字に切って「…」を付ける。max を省略したら 5
//     例: shorten("TypeScript") → "TypeS…"
// 省略時の値は、引数に times = 2 のように書いてください。
// 必須の引数と戻り値には型注釈を付けてください。

export function shorten(text: string, max = 5): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
