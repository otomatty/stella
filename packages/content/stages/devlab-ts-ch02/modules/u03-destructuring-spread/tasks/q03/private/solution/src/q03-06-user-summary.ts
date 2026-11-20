// 02-q03 分割代入とスプレッド構文 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/destructuring-assignment-from-objects
//       https://typescriptbook.jp/reference/values-types-variables/object/spread-syntax-for-object

export type User = { id: number; name: string; age: number; email: string };

// 問6
export function userSummary(user: User): string {
  const { name, age } = user;
  return `${name}（${age}）`;
}
