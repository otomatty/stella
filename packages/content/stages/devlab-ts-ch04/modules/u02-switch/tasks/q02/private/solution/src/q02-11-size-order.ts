// 04-q02 switch文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/switch
//       https://typescriptbook.jp/reference/statements/switch-fallthrough

// 問11
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
