// 04-e01 発展問題 ラベル付き break
//
// 教材: https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/label
//       https://jsprimer.net/basic/loop/
//
// 問題
// 2重のループを途中で抜けたいとき、break だけでは内側のループしか抜けられません。
// 外側のループにラベル（outer: for …）を付けると、break outer; で外側まで一度に抜けられます。
// 次の2つの関数を、ラベル付き break を使って書いてください。引数と戻り値には型注釈を付けること。
//
// 1. findPair(numbers, target)
//    足すと target になる2つの要素の番号の組 [i, j]（i < j）のうち、最初に見つかったものを返す。
//    なければ undefined。引数の配列は readonly number[]、戻り値は [number, number] | undefined
//    例: findPair([1, 4, 6, 3], 7) → [0, 2]
//
// 2. findInGrid(grid, value)
//    2次元の配列から value を探し、最初に見つかった位置 [行, 列] を返す。なければ undefined。
//    引数の grid は readonly (readonly number[])[]
//    例: findInGrid([[1, 2], [3, 4]], 3) → [1, 0]
//
// 説明すること（答えは、この下に // のコメントで書く）
// - ラベル付き break を使わずに書くなら、どう書くか

export function findPair() {}

export function findInGrid() {}
