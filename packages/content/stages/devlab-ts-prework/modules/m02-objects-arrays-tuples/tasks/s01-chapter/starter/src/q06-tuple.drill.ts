// 02-q06 タプル ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/tuple
//       https://typescriptbook.jp/reference/values-types-variables/array/destructuring-assignment-from-array
//
// 次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。
// 決まった数の要素を決まった順に並べる配列は、[number, number] のようなタプル型にする。
// 要素を取り出すときは const [x, y] = point; のような配列の分割代入を使うと読みやすい。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 名前と数を、[名前, 数] のタプルにする
//     例: makePair("りんご", 3) → ["りんご", 3]
export function makePair() {}

// 問2 [数, 名前] を [名前, 数] に並べ替える
//     例: flipPair([3, "りんご"]) → ["りんご", 3]
export function flipPair() {}

// 問3 [名前, 数] の名前を返す
//     例: nameOf(["りんご", 3]) → "りんご"
export function nameOf() {}

// 問4 [名前, 数] の数を返す
//     例: countOf(["りんご", 3]) → 3
export function countOf() {}

// 問5 2つの座標 [x, y] を足した座標を返す
//     例: addPoints([1, 2], [3, 4]) → [4, 6]
export function addPoints() {}

// 問6 座標 [x, y] を k 倍した座標を返す
//     例: scalePoint([1, 2], 3) → [3, 6]
export function scalePoint() {}

// 問7 座標 [x, y] の原点からの距離を返す
//     例: distanceFromOrigin([3, 4]) → 5
export function distanceFromOrigin() {}

// 問8 x と y から座標 [x, y] を作る
//     例: toPoint(1, 2) → [1, 2]
export function toPoint() {}

// 問9 引数の位置で分割代入して（function pointText([x, y]: [number, number])）、「(x, y)」を返す
//     例: pointText([1, 2]) → "(1, 2)"
export function pointText() {}

// 問10 色 [r, g, b] を「rgb(r, g, b)」にする
//     例: rgbText([255, 0, 0]) → "rgb(255, 0, 0)"
export function rgbText() {}

// 問11 a を b で割った [商, 余り] を返す（商は小数点以下切り捨て）
//     例: divmod(17, 5) → [3, 2]
export function divmod() {}

// 問12 「姓 名」の文字列を [姓, 名] に分ける。スペースがなければ名は空の文字列
//     例: splitName("山田 太郎") → ["山田", "太郎"]
export function splitName() {}

// 問13 2つの数を [小さい方, 大きい方] にする
//     例: order2(5, 2) → [2, 5]
export function order2() {}

// 問14 配列を [最初の要素, 残りの配列] に分ける。空の配列なら [undefined, []]
//     例: headTail(["a", "b", "c"]) → ["a", ["b", "c"]]
export function headTail() {}

// 問15 [開始, 終了] から、開始以上終了以下の整数を並べた配列を返す
//     例: expandRange([2, 5]) → [2, 3, 4, 5]
export function expandRange() {}

// 問16 座標 [x, y] が原点（0, 0）なら true
//     例: isOrigin([0, 0]) → true
export function isOrigin() {}

// 問17 [名前, 数] を「りんご × 3」の形にする
//     例: entryText(["りんご", 3]) → "りんご × 3"
export function entryText() {}

// 問18 [a, b] の合計を返す
//     例: sumPair([3, 4]) → 7
export function sumPair() {}

// 問19 座標 [x, y] を [y, x] にする
//     例: swapXY([1, 2]) → [2, 1]
export function swapXY() {}

// 問20 各要素を [番号, 要素] のタプルにした配列を返す（番号は0から）
//     例: withIndex(["a", "b"]) → [[0, "a"], [1, "b"]]
export function withIndex() {}
