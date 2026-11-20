// 03-q04 判別可能なユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union
//
// 引数と戻り値には型注釈を付けること。
// 判別可能なユニオン型を自分で定義して export し、その型を使って関数を書く。
// switch を使うときは、すべての場合の case を書く（ESLint の switch-exhaustiveness-check。switch は04章で詳しく扱う）。

// 問13 型 Vehicle（{ type: "car"; seats } か { type: "bike" }）を定義して export し、capacity(vehicle: Vehicle) を書く。car は seats、bike は 1
//     例: capacity({ type: "bike" }) → 1
// ここに型 Vehicle と関数 capacity を書く
