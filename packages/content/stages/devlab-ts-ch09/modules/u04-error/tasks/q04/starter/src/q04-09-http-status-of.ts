// 問9 error が HttpError ならその status、そうでなければ undefined を返す
//     例: httpStatusOf(new HttpError(500, "x")) → 500
// 引数と戻り値に型注釈を付けます。
// エラーの種類は instanceof で見分けます。
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

export function httpStatusOf() {}
