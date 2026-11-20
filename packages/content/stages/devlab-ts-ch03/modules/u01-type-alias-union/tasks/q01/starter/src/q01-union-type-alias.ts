// 03-q01 型エイリアスとユニオン型
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-alias
//       https://typescriptbook.jp/reference/values-types-variables/union
//
// 問題
// 1. 型 Id を「文字列または数値」のユニオン型として定義して export してください
//
// 2. normalizeId(id) を書いてください
//    - 数値なら、6桁になるように前を0で埋めた文字列にする
//    - 文字列なら、前後の空白を取り除き、英字を大文字にする
//    例: normalizeId(42)        → "000042"
//        normalizeId(" ab-01 ") → "AB-01"
//    ヒント: typeof id === "number" で、数値のときと文字列のときを分ける。padStart
//
// 3. joinIds(ids) を書いてください
//    ids の要素をそれぞれ normalizeId で整え、", " でつないだ文字列を返す。引数は readonly Id[]
//    例: joinIds([7, "x-9"]) → "000007, X-9"

export type Id = unknown;

export function normalizeId() {}

export function joinIds() {}
