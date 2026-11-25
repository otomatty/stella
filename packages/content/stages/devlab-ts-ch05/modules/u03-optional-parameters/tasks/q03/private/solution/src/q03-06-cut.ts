// 問6 text と、省略できる max。max 文字を超えたら、max 文字に切って「…」を付ける。省略したら 10
//     例: cut("TypeScript入門講座", 6) → "TypeSc…"
// 引数と戻り値には型注釈を付けてください。
// 省略できる引数は ? で宣言し、関数の中で ?? や === undefined で省略を扱ってください。

export function cut(text: string, max?: number): string {
  const limit = max ?? 10;
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}
