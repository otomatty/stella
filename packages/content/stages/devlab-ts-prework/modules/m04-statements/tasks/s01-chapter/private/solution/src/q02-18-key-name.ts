// 04-q02 switch文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/switch
//       https://typescriptbook.jp/reference/statements/switch-fallthrough

// 問18
export function keyName(code: number): string {
  switch (code) {
    case 13:
      return "Enter";
    case 27:
      return "Escape";
    case 32:
      return "Space";
    default:
      return "Other";
  }
}
