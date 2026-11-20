// 04-q01 if-else文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/if-else
//       https://typescriptbook.jp/reference/statements/ternary-operator

// 問20
export function stockStatus(stock: number): "在庫あり" | "残りわずか" | "在庫なし" {
  if (stock === 0) {
    return "在庫なし";
  }
  if (stock <= 5) {
    return "残りわずか";
  }
  return "在庫あり";
}
