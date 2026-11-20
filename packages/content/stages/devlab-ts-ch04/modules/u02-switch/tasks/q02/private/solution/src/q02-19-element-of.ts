// 04-q02 switch文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/switch
//       https://typescriptbook.jp/reference/statements/switch-fallthrough

// 問19
export function elementOf(sign: "牡羊" | "獅子" | "射手" | "牡牛" | "乙女" | "山羊"): "火" | "地" {
  switch (sign) {
    case "牡羊":
    case "獅子":
    case "射手":
      return "火";
    case "牡牛":
    case "乙女":
    case "山羊":
      return "地";
  }
}
