// 問20 error が Error なら { name, message }（name はエラーの name）、そうでなければ { name: "Unknown", message: String(error) } を返す
//     例: errorToJson(new NotFoundError("ユーザー")) → { name: "NotFoundError", message: "ユーザー が見つかりません" }
// 引数と戻り値に型注釈を付けます。
// エラーの種類は instanceof で見分けます。

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

export function errorToJson() {}
