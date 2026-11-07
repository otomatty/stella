// 05-q06 分割代入引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/destructuring-assignment-parameters
//       https://typescriptbook.jp/reference/functions/keyword-arguments-and-options-object-pattern

// 問12
export function pageRange({ page = 1, perPage = 10 }: { page?: number; perPage?: number }): {
  offset: number;
  limit: number;
} {
  return { offset: (page - 1) * perPage, limit: perPage };
}
