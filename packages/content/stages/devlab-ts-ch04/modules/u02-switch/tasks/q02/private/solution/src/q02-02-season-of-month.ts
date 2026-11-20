// 04-q02 switch文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/switch
//       https://typescriptbook.jp/reference/statements/switch-fallthrough

// 問2
export function seasonOfMonth(month: number): "春" | "夏" | "秋" | "冬" {
  switch (month) {
    case 3:
    case 4:
    case 5:
      return "春";
    case 6:
    case 7:
    case 8:
      return "夏";
    case 9:
    case 10:
    case 11:
      return "秋";
    case 12:
    case 1:
    case 2:
      return "冬";
    default:
      throw new Error("月は1〜12にしてください");
  }
}
