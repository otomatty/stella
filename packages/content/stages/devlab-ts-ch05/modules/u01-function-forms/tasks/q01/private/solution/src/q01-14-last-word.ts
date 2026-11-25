// 問14 【関数式】半角スペースで区切った最後の単語を返す
//     例: lastWord("hello big world") → "world"
// 引数と戻り値には型注釈を付けてください。
// 用意された関数式の形のまま、引数・型・中身を書き足してください。

export const lastWord = function (text: string): string {
  return text.slice(text.lastIndexOf(" ") + 1);
};
