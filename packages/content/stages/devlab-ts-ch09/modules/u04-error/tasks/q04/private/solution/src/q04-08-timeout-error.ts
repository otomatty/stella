// 問8 Error を継承したクラス TimeoutError を書く。constructor(ms) で、ms（数値）を readonly で持つ。message は `${ms}ミリ秒でタイムアウトしました`、name は "TimeoutError"
//     例: new TimeoutError(500).message → "500ミリ秒でタイムアウトしました"

export class TimeoutError extends Error {
  readonly ms: number;

  constructor(ms: number) {
    super(`${ms}ミリ秒でタイムアウトしました`);
    this.name = "TimeoutError";
    this.ms = ms;
  }
}
