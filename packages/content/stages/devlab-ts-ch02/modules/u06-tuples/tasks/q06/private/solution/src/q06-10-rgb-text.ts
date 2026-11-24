// 問10 色 [r, g, b] を「rgb(r, g, b)」にする
//     例: rgbText([255, 0, 0]) → "rgb(255, 0, 0)"
// 引数と戻り値には型注釈を付けます。
// タプルの要素は配列の分割代入で取り出せます。
export function rgbText(color: [number, number, number]): string {
  const [r, g, b] = color;
  return `rgb(${r}, ${g}, ${b})`;
}
