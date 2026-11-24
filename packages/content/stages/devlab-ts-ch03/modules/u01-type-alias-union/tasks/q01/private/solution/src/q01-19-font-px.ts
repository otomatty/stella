// 問19 型 FontSize（数値か "S"、"M"、"L"）を定義して export し、fontPx(size: FontSize) を書く。S は 12、M は 16、L は 20、数値はそのまま
//     例: fontPx("M") → 16
// 引数と戻り値に型注釈を付ける。
// 文字列のリテラル値と === で比較し、場合を分ける。

export type FontSize = number | "S" | "M" | "L";

export function fontPx(size: FontSize): number {
  if (size === "S") {
    return 12;
  }
  if (size === "M") {
    return 16;
  }
  if (size === "L") {
    return 20;
  }
  return size;
}
