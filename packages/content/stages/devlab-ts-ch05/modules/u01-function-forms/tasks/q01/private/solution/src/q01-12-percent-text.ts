// 問12 【関数式】0〜1 の割合を「50%」の形にする（四捨五入して整数）
//     例: percentText(0.5) → "50%"
// 引数と戻り値には型注釈を付けてください。
// 用意された関数式の形のまま、引数・型・中身を書き足してください。

export const percentText = function (ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
};
