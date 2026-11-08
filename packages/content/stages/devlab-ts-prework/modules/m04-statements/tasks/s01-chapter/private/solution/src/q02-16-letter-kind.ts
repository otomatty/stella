// 04-q02 switch文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/switch
//       https://typescriptbook.jp/reference/statements/switch-fallthrough

// 問16
export function letterKind(char: string): "母音" | "子音" {
  switch (char) {
    case "a":
    case "e":
    case "i":
    case "o":
    case "u":
      return "母音";
    default:
      return "子音";
  }
}
