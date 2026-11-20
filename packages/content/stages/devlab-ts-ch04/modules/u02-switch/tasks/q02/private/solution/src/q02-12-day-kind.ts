// 04-q02 switch文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/switch
//       https://typescriptbook.jp/reference/statements/switch-fallthrough

// 問12
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
