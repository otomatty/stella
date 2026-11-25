// 問11 成功なら "成功"、失敗の理由が Error ならその message、Error でなければ "不明なエラー" で解決する
//     例: errorMessage(Promise.reject(new Error("x"))) → "x" で解決する
// async と await を使わずに書いてください。
// 引数と戻り値に型注釈を付け、Promise の中身の型まで書いてください。
// then と catch を使ってください。

export function errorMessage(promise: Promise<unknown>): Promise<string> {
  return promise
    .then(() => "成功")
    .catch((error: unknown) => (error instanceof Error ? error.message : "不明なエラー"));
}
