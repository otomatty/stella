// 08-e02 発展問題 同じ取得を1回にまとめる（キャッシュ）
//
// 教材: https://typescriptbook.jp/reference/asynchronous/promise
//       https://typescriptbook.jp/reference/builtin-api/map
//
// 問題
// 画面のあちこちから同じユーザーの取得が同時に呼ばれると、同じ通信が何度も走ってしまいます。
// 非同期関数 fn を包んで、同じ key の取得を1回にまとめる関数 dedupe を書いてください。
//
// dedupe(fn) は、fn と同じ形の関数 get(key) を返す
// - get(key) を呼ぶと fn(key) の結果を返す
// - 同じ key の fn がまだ終わっていないうちに get(key) が呼ばれたら、fn を呼ばずに同じ Promise を返す
// - 成功した結果は覚えておき、次からは fn を呼ばずにその値を返す
// - 失敗した結果は覚えない。次に get(key) が呼ばれたら、もう一度 fn を呼ぶ
// - key は string か number
// 覚えておく場所には Map を使う（09章で詳しく扱う。new Map()、get、set、delete、has が使えれば十分）
//
// 型変数を使い、fn の key と戻り値の型に合わせて get の型が決まるようにする
//
// 説明すること（答えは、この下に // のコメントで書く）
// - 失敗した結果も覚えてしまうと、どんな困りごとが起きるか

export function dedupe() {}
