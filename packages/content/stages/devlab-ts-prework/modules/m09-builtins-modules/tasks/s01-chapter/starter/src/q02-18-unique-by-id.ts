// 09-q02 Set ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/set
//
// Set を使って書いてください。引数と戻り値には型注釈を付けること（Set<string> など）。型 User は定義済みです。
// 引数の配列や Set を変えないこと。引数の型は string[] や Set<string> と書く（readonly や ReadonlySet は使わない）。
// Set は、入れた順を覚えています。配列にしたいときは [...set] のようにスプレッド構文を使う。
// Set の union や intersection などのメソッドは、このテンプレートの設定（ES2022）では使えないので、has や add を使って書く。

export type User = { id: number; name: string };

// 問18 同じ id のユーザーは最初の1人だけを残した配列を返す
//     例: uniqueById([{ id: 1, name: "山田" }, { id: 1, name: "山田2" }]) → [{ id: 1, name: "山田" }]
export function uniqueById() {}
