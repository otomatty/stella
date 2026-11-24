// 問19 星座 "牡羊"、"獅子"、"射手" は "火"、"牡牛"、"乙女"、"山羊" は "地" を返す
//     例: elementOf("乙女") → "地"
// 引数と戻り値に型注釈を付けます。
// switch 文で分けます。
// 同じ処理になる case は続けて並べます。
export function elementOf(sign: "牡羊" | "獅子" | "射手" | "牡牛" | "乙女" | "山羊"): "火" | "地" {
  switch (sign) {
    case "牡羊":
    case "獅子":
    case "射手":
      return "火";
    case "牡牛":
    case "乙女":
    case "山羊":
      return "地";
  }
}
