// 05-q07 コールバック関数
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/functions/function-type-declaration
//
// 問題
// 関数を引数として受け取る関数を書いてください。関数の型は (price: number) => number のように書く。
// 中では map や filter を使わず、for-of で回して、受け取った関数を自分で呼ぶこと。
//
// 1. applyRule(prices, rule)
//    それぞれの価格に rule を当てはめた新しい配列を返す。引数の配列は readonly number[]
//    例: applyRule([100, 200], (p) => p * 2) → [200, 400]
//
// 2. countIf(items, predicate)
//    predicate が true を返す要素の数を返す。引数の配列は readonly string[]
//
// 3. findFirst(numbers, predicate)
//    predicate が true を返す最初の要素を返す。なければ undefined
//
// 4. repeatCall(times, fn)
//    fn を times 回呼ぶ。fn には 0, 1, 2… と、何回目かを渡す。何も返さない

export function applyRule() {}

export function countIf() {}

export function findFirst() {}

export function repeatCall() {}
