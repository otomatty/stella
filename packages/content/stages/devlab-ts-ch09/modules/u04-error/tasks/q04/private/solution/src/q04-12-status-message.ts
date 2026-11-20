// 09-q04 Error ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/error
//       https://typescriptbook.jp/reference/statements/exception

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export class NotFoundError extends HttpError {
  constructor(resource: string) {
    super(404, `${resource} が見つかりません`);
    this.name = "NotFoundError";
  }
}

// 問12
export function statusMessage(error: unknown): string {
  if (error instanceof NotFoundError) {
    return "見つかりません";
  }
  if (error instanceof HttpError) {
    return `通信エラー（${error.status}）`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "不明なエラー";
}
