// 04-q01 if-else文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/if-else
//       https://typescriptbook.jp/reference/statements/ternary-operator

// 問14
export function waterState(celsius: number): "氷" | "水" | "水蒸気" {
  if (celsius <= 0) {
    return "氷";
  }
  if (celsius < 100) {
    return "水";
  }
  return "水蒸気";
}
