// 問10 単位 "mm"、"cm"、"m"、"km" が何メートルかを返す。0.001、0.01、1、1000
//     例: metersPer("km") → 1000
// 引数と戻り値に型注釈を付けます。
// switch 文で分けます。
export function metersPer(unit: "mm" | "cm" | "m" | "km"): number {
  switch (unit) {
    case "mm":
      return 0.001;
    case "cm":
      return 0.01;
    case "m":
      return 1;
    case "km":
      return 1000;
  }
}
