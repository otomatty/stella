// 05-q06 分割代入引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/destructuring-assignment-parameters
//       https://typescriptbook.jp/reference/functions/keyword-arguments-and-options-object-pattern

// 問5
export function optionText({
  size = "M",
  color = "black",
}: {
  size?: string;
  color?: string;
}): string {
  return `${size}/${color}`;
}
