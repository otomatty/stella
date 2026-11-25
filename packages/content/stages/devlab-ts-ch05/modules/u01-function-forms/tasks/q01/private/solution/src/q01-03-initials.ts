// 問3 【関数宣言】名と姓の頭文字を「T.Y.」の形にする
//     例: initials("Taro", "Yamada") → "T.Y."
// 引数と戻り値には型注釈を付けてください。
// 用意された関数宣言の形のまま、引数・型・中身を書き足してください。

export function initials(first: string, last: string): string {
  return `${first.slice(0, 1)}.${last.slice(0, 1)}.`;
}
