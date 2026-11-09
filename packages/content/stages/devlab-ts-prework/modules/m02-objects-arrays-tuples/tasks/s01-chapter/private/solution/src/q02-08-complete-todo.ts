// 02-q02 オプションプロパティと readonly ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/optional-property
//       https://typescriptbook.jp/reference/values-types-variables/object/readonly-property

// 問8
export function completeTodo(todo: { readonly id: number; title: string; done: boolean }): {
  readonly id: number;
  title: string;
  done: boolean;
} {
  return { ...todo, done: true };
}
