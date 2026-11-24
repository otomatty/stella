// 問18 JSON.parse(text) の結果を返す。読めなければ、元のエラーを cause に入れて「設定を読めません」の Error を投げる（new Error("設定を読めません", { cause: error })）
//     例: loadSettings("{") → Error "設定を読めません"
// 引数と戻り値に型注釈を付けます。
// JSON.parse を try-catch で囲みます。
export function loadSettings() {}
