// 問14 気分 "happy"、"sad"、"angry" を "😊"、"😢"、"😠" にする
//     例: moodEmoji("sad") → "😢"
// 引数と戻り値に型注釈を付けます。
// switch 文で分けます。
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
