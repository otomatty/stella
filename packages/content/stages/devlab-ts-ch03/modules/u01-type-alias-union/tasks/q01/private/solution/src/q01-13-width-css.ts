// 問13 型 Width（数値か "auto"）を定義して export し、widthCss(width: Width) を書く。数値なら「100px」、"auto" ならそのまま
//     例: widthCss(100) → "100px"
// 引数と戻り値に型注釈を付ける。
// 文字列のリテラル値と === で比較し、場合を分ける。

export type Width = number | "auto";

export function widthCss(width: Width): string {
  return width === "auto" ? width : `${width}px`;
}
