// 問20 「width × height」の文字列を返す
//     例: sizeText(A4の紙) → "210 × 297"
// 引数と戻り値には型注釈を付けます。

export type Paper = { width: number; height: number };

export function sizeText(x: { width: number; height: number }): string {
  return `${x.width} × ${x.height}`;
}
