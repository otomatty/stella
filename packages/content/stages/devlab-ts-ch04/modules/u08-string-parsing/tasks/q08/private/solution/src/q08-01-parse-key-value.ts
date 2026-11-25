// 問1 "key=value" を [key, value] にする。「=」がなければ "= がありません: <text>" の Error を投げる（最初の「=」で分ける）
//     例: parseKeyValue("a=1") → ["a", "1"]
// 引数と戻り値に型注釈を付けます。
// 必要な部分を slice で取り出します。
export function parseKeyValue(text: string): [string, string] {
  const index = text.indexOf("=");
  if (index === -1) {
    throw new Error(`= がありません: ${text}`);
  }
  return [text.slice(0, index), text.slice(index + 1)];
}
