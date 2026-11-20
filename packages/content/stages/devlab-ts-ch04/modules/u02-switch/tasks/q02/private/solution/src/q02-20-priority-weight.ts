// 04-q02 switch文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/switch
//       https://typescriptbook.jp/reference/statements/switch-fallthrough

// 問20
export function priorityWeight(priority: "high" | "middle" | "low"): number {
  switch (priority) {
    case "high":
      return 3;
    case "middle":
      return 2;
    case "low":
      return 1;
  }
}
