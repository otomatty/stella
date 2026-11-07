// 03-q04 判別可能なユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union
//
// 引数と戻り値には型注釈を付けること。
// 判別可能なユニオン型を自分で定義して export し、その型を使って関数を書く。
// switch を使うときは、すべての場合の case を書く（ESLint の switch-exhaustiveness-check。switch は04章で詳しく扱う）。

// 問16 型 ApiResponse（{ ok: true; data: string } か { ok: false; status: number }）を定義して export し、responseText(response: ApiResponse) を書く。成功なら data、失敗なら「エラー 404」
//     例: responseText({ ok: false, status: 404 }) → "エラー 404"
// ここに型 ApiResponse と関数 responseText を書く
