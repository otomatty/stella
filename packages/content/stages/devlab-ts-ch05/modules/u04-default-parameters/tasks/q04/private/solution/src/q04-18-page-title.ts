// 問18 「タイトル | サイト名」を返す。site を省略したら「Agora」
//     例: pageTitle("設定") → "設定 | Agora"
// 省略時の値は、引数に times = 2 のように書いてください。
// 必須の引数と戻り値には型注釈を付けてください。

export function pageTitle(title: string, site = "Agora"): string {
  return `${title} | ${site}`;
}
