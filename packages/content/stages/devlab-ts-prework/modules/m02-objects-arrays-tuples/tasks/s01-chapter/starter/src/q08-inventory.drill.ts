// 02-q08 インデックス型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/index-signature
//       https://typescriptbook.jp/reference/values-types-variables/object/how-to-loop-an-object
//
// 次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。
// キーが自由な文字列で、値の型が決まっているオブジェクトは { [name: string]: number } のようなインデックス型にする。
// scores[name] のように取り出した値は、そのキーがないかもしれないので number | undefined になる。?? や !== undefined で扱う。
// すべてのキーや値を順に見るときは Object.keys、Object.values、Object.entries を使う。オブジェクトを変えるときは、新しいオブジェクトを作って返す。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 scores から name の点数を返す。なければ 0
//     例: scoreOf({ 山田: 80 }, "山田") → 80
export function scoreOf() {}

// 問2 key があれば true
//     例: hasKey({ a: "x" }, "a") → true
export function hasKey() {}

// 問3 name の点数を score にした、新しいオブジェクトを返す（元は変えない）
//     例: setScore({ 山田: 80 }, "佐藤", 70) → { 山田: 80, 佐藤: 70 }
export function setScore() {}

// 問4 キーの数を返す
//     例: keyCount({ a: 1, b: 2 }) → 2
export function keyCount() {}

// 問5 値の合計を返す
//     例: sumValues({ a: 1, b: 2 }) → 3
export function sumValues() {}

// 問6 key の値を1増やした、新しいオブジェクトを返す。key がなければ 1 にする
//     例: increment({ a: 1 }, "a") → { a: 2 }
export function increment() {}

// 問7 単語ごとに、出てきた回数を数える
//     例: countWords(["a", "b", "a"]) → { a: 2, b: 1 }
export function countWords() {}

// 問8 文字ごとに、出てきた回数を数える
//     例: countChars("banana") → { b: 1, a: 3, n: 2 }
export function countChars() {}

// 問9 キーを並べた配列を返す
//     例: keysOf({ a: 1, b: 2 }) → ["a", "b"]
export function keysOf() {}

// 問10 値がいちばん大きいキーを返す。同じなら先に出てきたキー。空なら undefined
//     例: topKey({ a: 1, b: 3, c: 2 }) → "b"
export function topKey() {}

// 問11 キーと値を入れ替えたオブジェクトを返す
//     例: invert({ a: "x", b: "y" }) → { x: "a", y: "b" }
export function invert() {}

// 問12 keys に含まれるキーだけを取り出した、新しいオブジェクトを返す。record にないキーは無視する
//     例: pickKeys({ a: 1, b: 2, c: 3 }, ["a", "c", "z"]) → { a: 1, c: 3 }
export function pickKeys() {}

// 問13 key を除いた、新しいオブジェクトを返す（元は変えない）
//     例: removeKey({ a: 1, b: 2 }, "a") → { b: 2 }
export function removeKey() {}

// 問14 2つの集計を合わせる。同じキーは値を足す
//     例: mergeCounts({ a: 1, b: 2 }, { b: 3, c: 4 }) → { a: 1, b: 5, c: 4 }
export function mergeCounts() {}

// 問15 単語を文字数ごとにまとめる。キーは文字数の文字列
//     例: groupByLength(["a", "bb", "c"]) → { "1": ["a", "c"], "2": ["bb"] }
export function groupByLength() {}

// 問16 価格表から item の価格を返す。なければ Error を投げる
//     例: priceOf({ りんご: 150 }, "りんご") → 150
export function priceOf() {}

// 問17 価格表 prices と注文 order（商品ごとの個数）から合計金額を返す。価格表にない商品があれば Error を投げる
//     例: orderTotal({ りんご: 150, みかん: 80 }, { りんご: 2, みかん: 3 }) → 540
export function orderTotal() {}

// 問18 値が min 以上のキーだけを残した、新しいオブジェクトを返す
//     例: filterAtLeast({ a: 1, b: 5, c: 3 }, 3) → { b: 5, c: 3 }
export function filterAtLeast() {}

// 問19 「キー=値」を「, 」でつないだ文字列にする
//     例: entriesText({ a: 1, b: 2 }) → "a=1, b=2"
export function entriesText() {}

// 問20 key の値を返す。なければ fallback
//     例: lookupOr({ ja: "こんにちは" }, "en", "?") → "?"
export function lookupOr() {}
