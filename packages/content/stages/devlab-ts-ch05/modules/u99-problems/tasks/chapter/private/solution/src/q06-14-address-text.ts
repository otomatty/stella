// 05-q06 分割代入引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/destructuring-assignment-parameters
//       https://typescriptbook.jp/reference/functions/keyword-arguments-and-options-object-pattern

// 問14
export function addressText({
  pref,
  city,
  line = "",
}: {
  pref: string;
  city: string;
  line?: string;
}): string {
  return `${pref}${city}${line}`;
}
