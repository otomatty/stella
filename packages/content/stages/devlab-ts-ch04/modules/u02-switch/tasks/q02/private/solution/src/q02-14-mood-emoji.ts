// 04-q02 switch文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/switch
//       https://typescriptbook.jp/reference/statements/switch-fallthrough

// 問14
export function moodEmoji(mood: "happy" | "sad" | "angry"): "😊" | "😢" | "😠" {
  switch (mood) {
    case "happy":
      return "😊";
    case "sad":
      return "😢";
    case "angry":
      return "😠";
  }
}
