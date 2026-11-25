// 問19 JSON として読めれば true、読めなければ false を返す。どちらの場合も、finally で log の末尾に "checked" を足す
//     例: checkWithLog([], "1") → true（log は ["checked"]）
// 引数と戻り値に型注釈を付けます。
// JSON.parse を try-catch で囲みます。
export function checkWithLog(log: string[], text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  } finally {
    log.push("checked");
  }
}
