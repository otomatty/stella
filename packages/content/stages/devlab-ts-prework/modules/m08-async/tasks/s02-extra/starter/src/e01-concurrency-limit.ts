// 08-e01 発展問題 同時に実行する数を制限する
//
// 教材: https://typescriptbook.jp/reference/asynchronous/promise
//       https://typescriptbook.jp/reference/asynchronous/await
//
// 問題
// Promise.all で100件の取得を一度に始めると、相手のサーバーに負担をかけたり、制限に引っかかったりします。
// 同時に実行する数を limit 個までにして、すべての要素を処理する関数 mapWithLimit を書いてください。
//
// mapWithLimit(items, limit, fn)
// - items のそれぞれについて fn(要素) を呼び、結果の配列を items の順で返す
// - 実行中（呼んだがまだ終わっていない）の fn が、同時に limit 個を超えないようにする
// - 1つ終わったら、すぐに次の要素の fn を始める（limit 個ずつ区切って、全部終わるのを待ってから次、ではない）
// - fn が1つでも失敗したら、その失敗をそのまま投げる
// - limit が1未満なら Error を投げる
// 型変数を使い、items と fn の戻り値の型に合わせて戻り値の型が変わるようにする
//
// ヒント: limit 個の「作業者」を用意し、それぞれが「まだ始めていない次の要素」を取っては fn を待つ、をくり返す
//
// 説明すること（答えは、この下に // のコメントで書く）
// - 「limit 個ずつ区切って Promise.all で待つ」書き方と比べて、どんなときに速くなるか

export function mapWithLimit() {}
