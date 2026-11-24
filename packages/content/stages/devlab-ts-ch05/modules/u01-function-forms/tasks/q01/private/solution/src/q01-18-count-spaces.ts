// 問18 【アロー関数】半角スペースの数を返す
//     例: countSpaces("a b c") → 2
// 引数と戻り値には型注釈を付けてください。
// 用意されたアロー関数の形のまま、引数・型・中身を書き足してください。
// 中身が1つの式なら、(n: number): number => n * 2 のように { } と return を省略できます。

export const countSpaces = (text: string): number => text.split(" ").length - 1;
