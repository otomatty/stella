// 04-q02 switch文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/switch
//       https://typescriptbook.jp/reference/statements/switch-fallthrough

// 問17
export function signalAction(light: "red" | "yellow" | "green"): "止まれ" | "注意" | "進め" {
  switch (light) {
    case "red":
      return "止まれ";
    case "yellow":
      return "注意";
    case "green":
      return "進め";
  }
}
