// 問11 status が 404 なら NotFoundError("ページ")、それ以外なら HttpError(status, `HTTP ${status}`) を作って返す（投げずに返す）
//     例: toHttpError(500).message → "HTTP 500"
// 引数と戻り値に型注釈を付けます。
// 定義済みのエラークラスを使います。

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

export function toHttpError(status: number): HttpError {
  return status === 404 ? new NotFoundError("ページ") : new HttpError(status, `HTTP ${status}`);
}
