// 問11 【関数式】km をマイルにする（1マイル = 1.609km）。小数第2位までに四捨五入
//     例: kmToMiles(10) → 6.22
// 引数と戻り値には型注釈を付けてください。
// 用意された関数式の形のまま、引数・型・中身を書き足してください。

export const kmToMiles = function (km: number): number {
  return Math.round((km / 1.609) * 100) / 100;
};
