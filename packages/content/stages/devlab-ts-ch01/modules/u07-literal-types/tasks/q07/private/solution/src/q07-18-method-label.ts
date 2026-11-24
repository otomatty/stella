// 問18 "GET" なら "取得"、"POST" なら "作成"、"DELETE" なら "削除" を返す
//     例: methodLabel("POST") → "作成"
// 引数や戻り値が決まった値だけを取る場合は、リテラル型を | でつないで型注釈を書いてください。
export function methodLabel(method: "GET" | "POST" | "DELETE"): "取得" | "作成" | "削除" {
  if (method === "GET") {
    return "取得";
  }
  if (method === "POST") {
    return "作成";
  }
  return "削除";
}
