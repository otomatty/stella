// 09-q01 Map ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/map
//
// 次の20問を、Map を使って書いてください。引数と戻り値には型注釈を付けること（Map<string, number> など）。
// 「新しい Map を返す」問題では、引数の Map を変えないこと。引数の型は Map<…> と書く（ReadonlyMap は使わない）。
// Map は、入れた順を覚えています。keys()、values()、entries() は入れた順に取り出せる。
// 配列にしたいときは [...map.keys()] のようにスプレッド構文を使う。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 [名前, 点数] の配列から Map を作る
//     例: toMap([["山田", 80], ["佐藤", 65]]) → Map { "山田" => 80, "佐藤" => 65 }
export function toMap() {}

// 問2 name の点数を返す。なければ 0
//     例: scoreOf(scores, "鈴木") → 0
export function scoreOf() {}

// 問3 name が Map のキーにあれば true
//     例: hasName(scores, "山田") → true
export function hasName() {}

// 問4 name に score を設定した新しい Map を返す（元の Map は変えない）
//     例: withScore(scores, "鈴木", 90) → 鈴木を足した新しい Map
export function withScore() {}

// 問5 name を取り除いた新しい Map を返す（元の Map は変えない）
//     例: withoutName(scores, "山田") → 山田のいない新しい Map
export function withoutName() {}

// 問6 Map に入っている数を返す
//     例: sizeOf(scores) → 2
export function sizeOf() {}

// 問7 キーの配列を返す（入れた順）
//     例: namesOf(scores) → ["山田", "佐藤"]
export function namesOf() {}

// 問8 値の合計を返す
//     例: totalScore(scores) → 145
export function totalScore() {}

// 問9 Map をオブジェクト（Record<string, number>）にする（Object.fromEntries）
//     例: toObject(scores) → { 山田: 80, 佐藤: 65 }
export function toObject() {}

// 問10 オブジェクトを Map にする（Object.entries）
//     例: fromObject({ 山田: 80 }) → Map { "山田" => 80 }
export function fromObject() {}

// 問11 文字ごとの出てきた回数の Map を返す（最初に出てきた順）
//     例: charCounts("banana") → Map { "b" => 1, "a" => 3, "n" => 2 }
export function charCounts() {}

// 問12 単語を、最初の1文字ごとにまとめた Map を返す（キーは最初に出てきた順、中の配列は元の順）
//     例: groupByInitial(["apple", "banana", "avocado"]) → Map { "a" => ["apple", "avocado"], "b" => ["banana"] }
export function groupByInitial() {}

// 問13 キーと値を入れ替えた新しい Map を返す
//     例: invert(Map { "red" => "赤" }) → Map { "赤" => "red" }
export function invert() {}

// 問14 2つの Map をまとめた新しい Map を返す。同じキーは値を足す（a のキーを a の順に、その後に b にだけあるキー）
//     例: mergeAdd(Map { "x" => 1 }, Map { "x" => 2, "y" => 3 }) → Map { "x" => 3, "y" => 3 }
export function mergeAdd() {}

// 問15 値がいちばん大きいキーを返す。同じ値なら先に入ったほう。空なら undefined
//     例: topName(Map { "山田" => 80, "佐藤" => 95 }) → "佐藤"
export function topName() {}

// 問16 [キー, 値] の配列を、値の大きい順に並べて返す。同じ値なら先に入った順
//     例: sortedByValue(Map { "a" => 1, "b" => 3 }) → [["b", 3], ["a", 1]]
export function sortedByValue() {}

// 問17 値が min 以上のものだけを残した新しい Map を返す
//     例: atLeast(Map { "山田" => 80, "佐藤" => 65 }, 70) → Map { "山田" => 80 }
export function atLeast() {}

// 問18 すべての値に fn を当てた新しい Map を返す
//     例: mapValues(Map { "a" => 1 }, (n) => n * 10) → Map { "a" => 10 }
export function mapValues() {}

// 問19 単語ごとに、最初に出てきた位置（0 から数える）の Map を返す
//     例: firstIndex(["a", "b", "a", "c"]) → Map { "a" => 0, "b" => 1, "c" => 3 }
export function firstIndex() {}

// 問20 { user, time } の配列から、ユーザーごとのいちばん大きい time の Map を返す（キーは最初に出てきた順）
//     例: lastSeen([{ user: "a", time: 5 }, { user: "a", time: 3 }]) → Map { "a" => 5 }
export function lastSeen() {}
