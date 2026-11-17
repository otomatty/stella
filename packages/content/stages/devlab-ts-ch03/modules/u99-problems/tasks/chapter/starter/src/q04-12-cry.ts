// 03-q04 判別可能なユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union
//
// 引数と戻り値には型注釈を付けること。
// 判別可能なユニオン型を自分で定義して export し、その型を使って関数を書く。
// switch を使うときは、すべての場合の case を書く（ESLint の switch-exhaustiveness-check。switch は04章で詳しく扱う）。

// 問12 型 Animal（{ kind: "dog"; name } か { kind: "cat"; name }）を定義して export し、cry(animal: Animal) を書く。「ポチ: ワン」「ミケ: ニャー」
//     例: cry({ kind: "dog", name: "ポチ" }) → "ポチ: ワン"
// ここに型 Animal と関数 cry を書く
