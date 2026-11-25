// 問15 横長なら "横長"、縦長なら "縦長"、同じなら "正方形" を返す
//     例: orientation(A4の紙) → "縦長"
// 引数と戻り値には型注釈を付けます。

export type Box = { width: number; height: number; depth: number };

export type Paper = { width: number; height: number };

export function orientation(x: { width: number; height: number }): "横長" | "縦長" | "正方形" {
  if (x.width > x.height) {
    return "横長";
  }
  if (x.width < x.height) {
    return "縦長";
  }
  return "正方形";
}
