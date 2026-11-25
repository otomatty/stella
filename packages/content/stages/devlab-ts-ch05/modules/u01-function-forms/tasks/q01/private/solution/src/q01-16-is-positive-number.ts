// 問16 【アロー関数】0より大きければ true
//     例: isPositiveNumber(-1) → false
// 引数と戻り値には型注釈を付けてください。
// 用意されたアロー関数の形のまま、引数・型・中身を書き足してください。
// 中身が1つの式なら、(n: number): number => n * 2 のように { } と return を省略できます。

export const isPositiveNumber = (n: number): boolean => n > 0;
