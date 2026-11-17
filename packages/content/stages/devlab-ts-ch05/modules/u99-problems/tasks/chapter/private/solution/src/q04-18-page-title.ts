// 05-q04 デフォルト引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/default-parameters

// 問18
export function pageTitle(title: string, site = "Agora"): string {
  return `${title} | ${site}`;
}
