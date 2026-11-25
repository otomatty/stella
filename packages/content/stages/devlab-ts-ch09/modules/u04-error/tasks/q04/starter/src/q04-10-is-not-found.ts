// 問10 error が NotFoundError、または status が 404 の HttpError なら true
//     例: isNotFound(new NotFoundError("ユーザー")) → true
// 引数と戻り値に型注釈を付けます。
// エラーの種類は instanceof で見分けます。
// NotFoundError は HttpError より先に確かめます。
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

export function isNotFound() {}
