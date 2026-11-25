// 問11 サイズ "S"、"M"、"L"、"XL" を 1、2、3、4 にする
//     例: sizeOrder("L") → 3
// 引数と戻り値に型注釈を付けます。
// switch 文で分けます。
export function sizeOrder(size: "S" | "M" | "L" | "XL"): number {
  switch (size) {
    case "S":
      return 1;
    case "M":
      return 2;
    case "L":
      return 3;
    case "XL":
      return 4;
  }
}
