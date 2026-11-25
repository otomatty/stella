// 問6 "red"、"green"、"blue" を "#ff0000"、"#00ff00"、"#0000ff" にする
//     例: colorHex("blue") → "#0000ff"
// 引数と戻り値に型注釈を付けます。
// switch 文で分けます。
export function colorHex(color: "red" | "green" | "blue"): string {
  switch (color) {
    case "red":
      return "#ff0000";
    case "green":
      return "#00ff00";
    case "blue":
      return "#0000ff";
  }
}
