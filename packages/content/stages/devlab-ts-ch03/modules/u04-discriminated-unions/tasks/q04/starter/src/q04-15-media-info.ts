// 03-q04 判別可能なユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union
//
// 引数と戻り値には型注釈を付けること。
// 判別可能なユニオン型を自分で定義して export し、その型を使って関数を書く。
// switch を使うときは、すべての場合の case を書く（ESLint の switch-exhaustiveness-check。switch は04章で詳しく扱う）。

// 問15 型 Media（{ type: "image"; width; height } か { type: "video"; seconds }）を定義して export し、mediaInfo(media: Media) を書く。「画像 100×200」「動画 90秒」
//     例: mediaInfo({ type: "video", seconds: 90 }) → "動画 90秒"
// ここに型 Media と関数 mediaInfo を書く
