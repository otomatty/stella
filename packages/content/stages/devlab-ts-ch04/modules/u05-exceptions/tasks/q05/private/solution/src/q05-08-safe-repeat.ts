// 問8 text.repeat(times) を返す。times が負などで例外が出たら空の文字列を返す
//     例: safeRepeat("ab", -1) → ""
// 引数と戻り値に型注釈を付けます。
// text.repeat(times) を try-catch で囲みます。
export function safeRepeat(text: string, times: number): string {
  try {
    return text.repeat(times);
  } catch {
    return "";
  }
}
