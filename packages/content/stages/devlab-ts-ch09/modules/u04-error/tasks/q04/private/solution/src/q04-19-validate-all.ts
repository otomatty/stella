// 09-q04 Error ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/error
//       https://typescriptbook.jp/reference/statements/exception

// 問19
export function validateAll(values: number[]): void {
  const errors = values.filter((n) => n < 0).map((n) => new RangeError(`${n} は負の数です`));
  if (errors.length > 0) {
    throw new AggregateError(errors, "負の数があります");
  }
}
