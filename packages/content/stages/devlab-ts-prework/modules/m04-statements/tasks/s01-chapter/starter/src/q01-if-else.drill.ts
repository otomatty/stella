// 04-q01 if-else文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/if-else
//       https://typescriptbook.jp/reference/statements/ternary-operator
//
// 次の20個の関数を、if-else 文（短いものは三項演算子でもよい）で書いてください。引数と戻り値には型注釈を付けること。
// 決まった値しか返さない関数は、戻り値をリテラル型のユニオンにする（例: "合格" | "不合格"）。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 絶対値を返す（Math.abs を使わず、if で負なら符号を反転する）
//     例: absValue(-5) → 5
export function absValue() {}

// 問2 大きい方を返す（Math.max を使わない）
//     例: maxOf2(3, 8) → 8
export function maxOf2() {}

// 問3 60点以上なら "合格"、それ未満は "不合格"
//     例: passFail(60) → "合格"
export function passFail() {}

// 問4 BMI が 18.5 未満なら "やせ"、25 未満なら "普通"、それ以上は "肥満"
//     例: bmiLabel(22) → "普通"
export function bmiLabel() {}

// 問5 18歳未満は "子ども"、65歳未満は "大人"、それ以上は "シニア"
//     例: ageGroup(70) → "シニア"
export function ageGroup() {}

// 問6 気温が 15 未満なら "寒い"、28 以上なら "暑い"、それ以外は "ちょうどよい"
//     例: feeling(30) → "暑い"
export function feeling() {}

// 問7 正なら "正"、負なら "負"、0 なら "ゼロ"
//     例: signText(-2) → "負"
export function signText() {}

// 問8 バスの運賃を返す。6歳未満は 0円、12歳以下は 120円、それ以外は 240円
//     例: busFare(10) → 120
export function busFare() {}

// 問9 合計が 10000円以上なら 0.1、5000円以上なら 0.05、それ未満は 0 を返す
//     例: discountRate(6000) → 0.05
export function discountRate() {}

// 問10 5〜10時は "おはよう"、11〜17時は "こんにちは"、それ以外は "こんばんは"
//     例: greetingFor(8) → "おはよう"
export function greetingFor() {}

// 問11 a が大きければ "a のほうが大きい"、b が大きければ "b のほうが大きい"、同じなら "同じ"
//     例: compareText(1, 2) → "b のほうが大きい"
export function compareText() {}

// 問12 座標 (x, y) が第何象限かを返す。どちらかが 0（軸の上）なら 0
//     例: quadrant(-1, 2) → 2
export function quadrant() {}

// 問13 タイム（秒）が 60 未満なら "金"、90 未満なら "銀"、120 未満なら "銅"、それ以外は "参加賞"
//     例: medalByTime(75) → "銀"
export function medalByTime() {}

// 問14 水温が 0 以下なら "氷"、100 未満なら "水"、それ以上は "水蒸気"
//     例: waterState(100) → "水蒸気"
export function waterState() {}

// 問15 駐車料金を返す。30分以下なら無料。30分を超えたら、停めた時間全体について30分ごとに 200円（30分に満たない分も 200円）
//     例: parkingFee(61) → 600
export function parkingFee() {}

// 問16 風速が 5 未満なら "弱い"、10 未満なら "やや強い"、それ以上は "強い"
//     例: windLevel(7) → "やや強い"
export function windLevel() {}

// 問17 長い方の文字列を返す。同じ長さなら a
//     例: pickLonger("abc", "de") → "abc"
export function pickLonger() {}

// 問18 偶数なら "偶数"、奇数なら "奇数"（三項演算子で書く）
//     例: parityLabel(7) → "奇数"
export function parityLabel() {}

// 問19 22時〜翌5時前（22, 23, 0〜4時）は運賃を 2割増しにする（1円未満は四捨五入）。それ以外はそのまま
//     例: taxiFare(1000, 23) → 1200
export function taxiFare() {}

// 問20 在庫が 0 なら "在庫なし"、5 以下なら "残りわずか"、それ以外は "在庫あり"
//     例: stockStatus(3) → "残りわずか"
export function stockStatus() {}
