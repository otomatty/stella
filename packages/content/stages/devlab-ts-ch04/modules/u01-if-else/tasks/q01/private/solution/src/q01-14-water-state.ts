// 問14 水温が 0 以下なら "氷"、100 未満なら "水"、それ以上は "水蒸気"
//     例: waterState(100) → "水蒸気"
// 引数と戻り値に型注釈を付けます。
// if-else 文で分けます。短い場合は三項演算子でも構いません。
export function waterState(celsius: number): "氷" | "水" | "水蒸気" {
  if (celsius <= 0) {
    return "氷";
  }
  if (celsius < 100) {
    return "水";
  }
  return "水蒸気";
}
