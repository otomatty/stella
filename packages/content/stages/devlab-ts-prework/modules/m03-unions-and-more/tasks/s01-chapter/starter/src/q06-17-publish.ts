// 03-q06 インターセクション型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/intersection
//
// 引数と戻り値には型注釈を付けること。
// Named、Aged、Priced などの小さな型は定義済みです。Named & Aged のように & でつなぐと、両方のプロパティを持つ型になる。
// インターセクション型に type で名前を付けて export し、その型を使って関数を書く。

// 問17 型 Draft（{ title: string }）と、型 Published（Draft & { publishedAt: Date }）を定義して export し、publish(draft: Draft, at: Date) を書く。publishedAt を足した Published を返す
//     例: publish({ title: "お知らせ" }, 日時) → { title: "お知らせ", publishedAt: 日時 }
// ここに型 Draft、型 Published と関数 publish を書く
