// 問11 "a=1&b=2" を { a: "1", b: "2" } にする。空の文字列なら {}。「=」のない部分は値を空の文字列にする
//     例: parseQuery("a=1&b=2") → { a: "1", b: "2" }
// 引数と戻り値に型注釈を付けます。
// 文字列を split で区切ります。
export function parseQuery(text: string): { [key: string]: string } {
  const result: { [key: string]: string } = {};
  if (text === "") {
    return result;
  }
  for (const pair of text.split("&")) {
    const index = pair.indexOf("=");
    if (index === -1) {
      result[pair] = "";
    } else {
      result[pair.slice(0, index)] = pair.slice(index + 1);
    }
  }
  return result;
}
