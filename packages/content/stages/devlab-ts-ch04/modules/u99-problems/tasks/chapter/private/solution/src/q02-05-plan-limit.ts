// 04-q02 switch文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/switch
//       https://typescriptbook.jp/reference/statements/switch-fallthrough

// 問5
export function planLimit(plan: "free" | "pro" | "team"): number {
  switch (plan) {
    case "free":
      return 1;
    case "pro":
      return 10;
    case "team":
      return 100;
  }
}
