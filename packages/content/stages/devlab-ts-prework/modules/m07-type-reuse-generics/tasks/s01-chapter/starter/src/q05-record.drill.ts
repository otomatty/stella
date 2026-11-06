// 07-q05 Record ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/record
//
// 次の20問を解いてください。型 Category と Weekday は定義済みです。
// Record<Keys, Type> は、キーが Keys、値が Type のオブジェクトの型。Keys にユニオン型を渡すと、そのすべてのキーを持つ。
// 関数は引数と戻り値に型注釈を付けること。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

export type Category = "food" | "drink" | "other";
export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri";

// 問1 型 CategoryCount を、キーが Category、値が数値の Record として作る
// ここに型 CategoryCount を書く

// 問2 型 Schedule を、キーが Weekday、値が文字列の配列の Record として作る
// ここに型 Schedule を書く

// 問3 すべてのカテゴリが 0 の Record<Category, number> を返す
//     例: emptyCounts() → { food: 0, drink: 0, other: 0 }
export function emptyCounts() {}

// 問4 カテゴリの配列から、それぞれの数を Record<Category, number> で返す（出てこないカテゴリは 0）
//     例: countCategories(["food", "food", "drink"]) → { food: 2, drink: 1, other: 0 }
export function countCategories() {}

// 問5 定数 CATEGORY_NAMES を Record<Category, string> として宣言して export し（food は "食べ物"、drink は "飲み物"、other は "その他"）、categoryName(category) でその名前を返す
//     例: categoryName("drink") → "飲み物"
// ここに CATEGORY_NAMES と関数 categoryName を書く

// 問6 すべての曜日が空の配列の Record<Weekday, string[]> を返す
//     例: emptySchedule() → { mon: [], tue: [], wed: [], thu: [], fri: [] }
export function emptySchedule() {}

// 問7 schedule の day に event を足した、新しい Record<Weekday, string[]> を返す（元は変えない）
//     例: addEvent(schedule, "mon", "会議").mon → ["会議"]
export function addEvent() {}

// 問8 予定がいちばん多い曜日を返す。同じなら mon、tue… の順で先の方
//     例: busiestDay(schedule) → "wed"
export function busiestDay() {}

// 問9 Record<string, number> の得点表から、最高得点の人を返す。同点なら先に出てきた人。空なら undefined
//     例: topScorer({ 山田: 70, 佐藤: 90 }) → "佐藤"
export function topScorer() {}

// 問10 Record<string, string> のキーと値を入れ替える
//     例: invertRecord({ a: "x" }) → { x: "a" }
export function invertRecord() {}

// 問11 Record<string, number> の値の合計
//     例: sumRecord({ a: 1, b: 2 }) → 3
export function sumRecord() {}

// 問12 Record<string, number> のすべての値に fn を当てはめた、新しい Record を返す
//     例: mapRecord({ a: 1, b: 2 }, (n) => n * 10) → { a: 10, b: 20 }
export function mapRecord() {}

// 問13 値が min 以上のものだけを残した、新しい Record<string, number> を返す
//     例: filterRecord({ a: 1, b: 5 }, 3) → { b: 5 }
export function filterRecord() {}

// 問14 [キー, 値] の配列から Record<string, number> を作る（同じキーは後の方）
//     例: fromPairs([["a", 1], ["b", 2]]) → { a: 1, b: 2 }
export function fromPairs() {}

// 問15 Record<string, number> を [キー, 値] の配列にする
//     例: toPairs({ a: 1, b: 2 }) → [["a", 1], ["b", 2]]
export function toPairs() {}

// 問16 価格表 Record<Category, number> から、category の価格を返す
//     例: priceOf({ food: 300, drink: 150, other: 500 }, "drink") → 150
export function priceOf() {}

// 問17 価格表 Record<Category, number> と、注文 Partial<Record<Category, number>>（カテゴリごとの個数。ないカテゴリは 0 個）から合計金額を返す
//     例: orderTotal({ food: 300, drink: 150, other: 500 }, { food: 2 }) → 600
export function orderTotal() {}

// 問18 定数 WEEKDAY_LABELS を Record<Weekday, string> として宣言して export し（mon は "月"、tue は "火"、wed は "水"、thu は "木"、fri は "金"）、weekdayLabel(day) でその名前を返す
//     例: weekdayLabel("wed") → "水"
// ここに WEEKDAY_LABELS と関数 weekdayLabel を書く

// 問19 単語を最初の1文字ごとにまとめた Record<string, string[]> を返す
//     例: groupByInitial(["apple", "avocado", "banana"]) → { a: ["apple", "avocado"], b: ["banana"] }
export function groupByInitial() {}

// 問20 文字ごとの出てきた回数を Record<string, number> で返す
//     例: countLetters("aab") → { a: 2, b: 1 }
export function countLetters() {}
