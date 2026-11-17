// 05-q04 デフォルト引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/default-parameters

// 問1
export function greetGuest(name = "ゲスト"): string {
  return `こんにちは、${name}さん`;
}
