// 02-q02 オプションプロパティと readonly ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/optional-property
//       https://typescriptbook.jp/reference/values-types-variables/object/readonly-property

// 問11
export function countFilled(form: { a?: string; b?: string; c?: string }): number {
  let count = 0;
  if (form.a !== undefined) {
    count++;
  }
  if (form.b !== undefined) {
    count++;
  }
  if (form.c !== undefined) {
    count++;
  }
  return count;
}
