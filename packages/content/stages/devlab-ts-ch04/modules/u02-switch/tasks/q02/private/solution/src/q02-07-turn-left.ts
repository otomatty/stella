// 問7 方角 "N"、"E"、"S"、"W" を、左に90度回った方角にする。N → W → S → E → N
//     例: turnLeft("N") → "W"
// 引数と戻り値に型注釈を付けます。
// switch 文で分けます。
export function turnLeft(direction: "N" | "E" | "S" | "W"): "N" | "E" | "S" | "W" {
  switch (direction) {
    case "N":
      return "W";
    case "W":
      return "S";
    case "S":
      return "E";
    case "E":
      return "N";
  }
}
