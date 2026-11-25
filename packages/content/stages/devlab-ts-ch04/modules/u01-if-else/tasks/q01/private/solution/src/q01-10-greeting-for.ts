// 問10 5〜10時は "おはよう"、11〜17時は "こんにちは"、それ以外は "こんばんは"
//     例: greetingFor(8) → "おはよう"
// 引数と戻り値に型注釈を付けます。
// if-else 文で分けます。短い場合は三項演算子でも構いません。
export function greetingFor(hour: number): "おはよう" | "こんにちは" | "こんばんは" {
  if (hour >= 5 && hour <= 10) {
    return "おはよう";
  }
  if (hour >= 11 && hour <= 17) {
    return "こんにちは";
  }
  return "こんばんは";
}
