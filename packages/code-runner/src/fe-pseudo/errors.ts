/**
 * 擬似言語トランスパイラの構造化エラー (#133)。
 *
 * 学習者に見せる前提のため、 メッセージは日本語で「何が・どこで」を書く。
 * 採点 UI には `SYNTAX_ERROR: <message> (N 行目)` の形で 1 行として出す
 * (`fe-pseudo-runner.ts` が整形する)。
 */

export class FePseudoError extends Error {
  constructor(
    message: string,
    readonly line: number,
    readonly column: number,
  ) {
    super(message);
    this.name = "FePseudoError";
  }

  /** 採点結果に載せる 1 行表現。 */
  toDisplayString(): string {
    return `${this.message} (${this.line} 行目)`;
  }
}

export function feError(message: string, line: number, column: number): FePseudoError {
  return new FePseudoError(message, line, column);
}
