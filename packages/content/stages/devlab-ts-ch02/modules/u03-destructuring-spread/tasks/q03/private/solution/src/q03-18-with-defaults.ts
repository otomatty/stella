// 02-q03 分割代入とスプレッド構文 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/destructuring-assignment-from-objects
//       https://typescriptbook.jp/reference/values-types-variables/object/spread-syntax-for-object

// 問18
export function withDefaults(options: { size?: number; color?: string }): {
  size: number;
  color: string;
} {
  return { size: 10, color: "black", ...options };
}
