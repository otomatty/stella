// 問12 NotFoundError なら "見つかりません"、それ以外の HttpError なら `通信エラー（${status}）`、それ以外の Error なら message、Error でなければ "不明なエラー" を返す
//     例: statusMessage(new HttpError(503, "x")) → "通信エラー（503）"
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
