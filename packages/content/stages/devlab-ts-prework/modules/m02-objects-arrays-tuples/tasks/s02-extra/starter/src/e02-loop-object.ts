// 02-e02 発展問題 オブジェクトをループする
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/how-to-loop-an-object
//
// 問題
// 名前と得点の組を表す型 Scores は定義済みです。次の3つの関数を書いてください。
// 引数と戻り値には型注釈を付けること。
//
// 1. totalScore(scores)
//    得点の合計を返す
//
// 2. topScorer(scores)
//    最高得点の人の名前を返す。同点なら先に出てきた人。scores が空なら undefined を返す
//
// 3. passedNames(scores, border)
//    border 点以上の人の名前を、出てきた順に配列で返す
//
// ヒント: Object.keys、Object.values、Object.entries

export type Scores = { [name: string]: number };

export function totalScore() {}

export function topScorer() {}

export function passedNames() {}
