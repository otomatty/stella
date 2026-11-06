// 05-q10 配列のユーティリティ ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/values-types-variables/array/array-operations
//
// ★総合問題（配列のユーティリティ）で使う書き方を繰り返します。生徒を表す型 Student は定義済みです。
// 次の20個の関数を書いてください。引数の配列は readonly Student[] にし、元の配列や生徒のオブジェクトは変えないこと。引数と戻り値には型注釈を付けること。
// map、filter、some、every、find、sort（コピーしてから）などを使ってよい。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

export type Student = { name: string; grade: number; score: number };

// 問1 名前の配列を返す
//     例: namesOf(students) → ["山田", "佐藤", "鈴木"]
export function namesOf() {}

// 問2 点数の平均を返す。空の配列なら 0
//     例: averageScore([80点, 90点]) → 85
export function averageScore() {}

// 問3 点数がいちばん高い生徒を返す。同じなら先の方。空なら undefined
//     例: bestStudent(students) → 佐藤
export function bestStudent() {}

// 問4 grade 年生の生徒だけを返す
//     例: inGrade(students, 1) → 1年生の配列
export function inGrade() {}

// 問5 border 点以上の生徒だけを返す
//     例: passedStudents(students, 70) → 70点以上の配列
export function passedStudents() {}

// 問6 点数の高い順に並べた新しい配列を返す。同じ点数なら元の順
//     例: sortByScore(students) → 高い順の配列
export function sortByScore() {}

// 問7 点数の高い順に「1位 佐藤」「2位 山田」…と並べた配列を返す
//     例: rankLabels(students) → ["1位 佐藤", "2位 山田"]
export function rankLabels() {}

// 問8 学年ごとにまとめる。キーは学年の文字列（"1"、"2" …）
//     例: groupByGrade(students) → { "1": [...], "2": [...] }
export function groupByGrade() {}

// 問9 学年ごとの人数。キーは学年の文字列
//     例: countByGrade(students) → { "1": 2, "2": 1 }
export function countByGrade() {}

// 問10 学年ごとの平均点（小数第1位までに四捨五入）。キーは学年の文字列
//     例: averageByGrade(students) → { "1": 70, "2": 95 }
export function averageByGrade() {}

// 問11 border 点以上の生徒とそれ以外に分け、[合格の配列, 不合格の配列] を返す
//     例: splitByPass(students, 70) → [[山田], [鈴木]]
export function splitByPass() {}

// 問12 点数の高い順に n 人を返す
//     例: topStudents(students, 1) → [佐藤]
export function topStudents() {}

// 問13 { 名前: 点数 } のオブジェクトを返す
//     例: scoreTable(students) → { 山田: 80, 佐藤: 95 }
export function scoreTable() {}

// 問14 100点の生徒が1人でもいれば true（some を使う）
//     例: hasPerfect(students) → false
export function hasPerfect() {}

// 問15 全員が border 点以上なら true（every を使う）
//     例: everyonePassed(students, 60) → true
export function everyonePassed() {}

// 問16 点数の合計
//     例: totalScore(students) → 235
export function totalScore() {}

// 問17 [最低点, 最高点] を返す。空の配列なら Error を投げる
//     例: scoreRange(students) → [60, 95]
export function scoreRange() {}

// 問18 名前で生徒を探す（find を使う）。いなければ undefined
//     例: findByName(students, "佐藤") → 佐藤
export function findByName() {}

// 問19 name の生徒の点数だけを score にした新しい配列を返す。元の配列と生徒は変えない
//     例: updateScore(students, "山田", 90) → 山田の点数が 90 の新しい配列
export function updateScore() {}

// 問20 「人数 3、平均 78.3、最高 佐藤（95）」の形にする（平均は小数第1位まで。toFixed(1)）。空なら「人数 0」
//     例: summaryText(students) → "人数 3、平均 78.3、最高 佐藤（95）"
export function summaryText() {}
