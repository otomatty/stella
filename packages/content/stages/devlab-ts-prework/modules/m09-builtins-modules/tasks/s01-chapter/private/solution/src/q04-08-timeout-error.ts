// 09-q04 Error ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/error
//       https://typescriptbook.jp/reference/statements/exception

// 問8
export class TimeoutError extends Error {
  readonly ms: number;

  constructor(ms: number) {
    super(`${ms}ミリ秒でタイムアウトしました`);
    this.name = "TimeoutError";
    this.ms = ms;
  }
}
