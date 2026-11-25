// 問15 【アサーション】string | undefined を受け取り、undefined なら "値がありません" の Error を投げる。戻り値の型は asserts value is string
//     例: assertDefined(undefined) → Error

export function assertDefined(value: string | undefined): asserts value is string {
  if (value === undefined) {
    throw new Error("値がありません");
  }
}
