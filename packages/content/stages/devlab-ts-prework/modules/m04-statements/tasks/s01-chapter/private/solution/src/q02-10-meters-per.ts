// 04-q02 switch文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/switch
//       https://typescriptbook.jp/reference/statements/switch-fallthrough

// 問10
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
