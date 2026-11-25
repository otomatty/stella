// 問12 "月"〜"金" は "平日"、"土" と "日" は "週末"、それ以外は Error を投げる
//     例: dayKind("土") → "週末"
// 引数と戻り値に型注釈を付けます。
// switch 文で分けます。
// 同じ処理になる case は続けて並べます。
// どの case にも当てはまらない値は default で扱います。
export function dayKind(day: string): "平日" | "週末" {
  switch (day) {
    case "月":
    case "火":
    case "水":
    case "木":
    case "金":
      return "平日";
    case "土":
    case "日":
      return "週末";
    default:
      throw new Error(`曜日ではありません: ${day}`);
  }
}
