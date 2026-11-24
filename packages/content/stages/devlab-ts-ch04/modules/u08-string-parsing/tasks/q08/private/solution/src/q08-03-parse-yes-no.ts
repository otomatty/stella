// 問3 "true"、"yes"、"1" は true、"false"、"no"、"0" は false にする（大文字小文字は問わない）。それ以外は "真偽値ではありません: <text>" の Error
//     例: parseYesNo("YES") → true
// 引数と戻り値に型注釈を付けます。
export function parseYesNo(text: string): boolean {
  switch (text.toLowerCase()) {
    case "true":
    case "yes":
    case "1":
      return true;
    case "false":
    case "no":
    case "0":
      return false;
    default:
      throw new Error(`真偽値ではありません: ${text}`);
  }
}
