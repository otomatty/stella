// 問18 最初の単語より後ろの単語を、配列で返す（空白がいくつ続いてもよい）
//     例: commandArgs("add  1   2") → ["1", "2"]
// 引数と戻り値に型注釈を付けます。
// 文字列を split で区切ります。
export function commandArgs(text: string): string[] {
  const words = text.trim().split(/\s+/);
  return words.slice(1).filter((word) => word !== "");
}
