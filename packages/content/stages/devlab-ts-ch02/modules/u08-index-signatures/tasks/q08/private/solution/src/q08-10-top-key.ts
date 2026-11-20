// 02-q08 インデックス型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/index-signature
//       https://typescriptbook.jp/reference/values-types-variables/object/how-to-loop-an-object

// 問10
export function topKey(record: { [key: string]: number }): string | undefined {
  let top: string | undefined;
  let best = -Infinity;
  for (const [key, value] of Object.entries(record)) {
    if (value > best) {
      top = key;
      best = value;
    }
  }
  return top;
}
