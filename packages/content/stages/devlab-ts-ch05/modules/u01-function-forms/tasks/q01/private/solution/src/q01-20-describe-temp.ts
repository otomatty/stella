// 問20 【アロー関数】気温が 25 以上なら "夏日"、それ未満は "普通" を返す（{ } と return を使って書く）
//     例: describeTemp(30) → "夏日"
// 引数と戻り値には型注釈を付けてください。
// 用意されたアロー関数の形のまま、引数・型・中身を書き足してください。

export const describeTemp = (celsius: number): "夏日" | "普通" => {
  if (celsius >= 25) {
    return "夏日";
  }
  return "普通";
};
