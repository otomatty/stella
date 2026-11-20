// 03-q04 判別可能なユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union
//
// 引数と戻り値には型注釈を付けること。
// 判別可能なユニオン型を自分で定義して export し、その型を使って関数を書く。
// switch を使うときは、すべての場合の case を書く（ESLint の switch-exhaustiveness-check。switch は04章で詳しく扱う）。

// 問20 型 Reading（{ unit: "C"; value } か { unit: "F"; value }）を定義して export し、toCelsius(reading: Reading) を書く。摂氏にして小数第1位までに四捨五入（F は (value - 32) × 5 ÷ 9）
//     例: toCelsius({ unit: "F", value: 212 }) → 100
// ここに型 Reading と関数 toCelsius を書く
