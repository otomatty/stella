// 問5 【関数宣言】英字を含み、すべて大文字なら true
//     例: isAllUpper("ABC") → true
// 引数と戻り値には型注釈を付けてください。
// 用意された関数宣言の形のまま、引数・型・中身を書き足してください。

export function isAllUpper(text: string): boolean {
  return text === text.toUpperCase() && text !== text.toLowerCase();
}
