// 問題
// BMI（体格指数）を計算する2つの関数を書いてください。
//
// 1. calcBmi(heightCm, weightKg)
//    BMI = 体重(kg) ÷ (身長(m) × 身長(m))
//    身長はcmで受け取るので、mに直してから計算する。結果は小数第1位までに四捨五入する
//    例: calcBmi(170, 65) → 22.5
//
// 2. bmiReport(heightCm, weightKg)
//    calcBmi を使ってBMIを求め、判定を付けた文字列を返す。BMIは小数第1位まで表示する
//    判定: 18.5未満は「低体重」、18.5以上25未満は「普通体重」、25以上は「肥満」
//    例: bmiReport(170, 65)  → "BMI 22.5（普通体重）"
//        bmiReport(200, 100) → "BMI 25.0（肥満）"
//    ヒント: 数値の toFixed(1) で、小数第1位までの文字列にできる
//
// 条件
// - 引数には型注釈を書く
// - 戻り値と、関数の中の変数には型注釈を書かない（推論に任せる）
//
// 説明すること（答えは、この下に // のコメントで書く）
// - 引数の型注釈を消すと、どんなエラーになるか。なぜ引数だけは推論されないのか

// 引数は呼び出し側から推論できないため、注釈がないと暗黙の any になり strict ではエラー（TS7006）になる
export function calcBmi(heightCm: number, weightKg: number) {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return Math.round(bmi * 10) / 10;
}

export function bmiReport(heightCm: number, weightKg: number) {
  const bmi = calcBmi(heightCm, weightKg);
  let label = "肥満";
  if (bmi < 18.5) {
    label = "低体重";
  } else if (bmi < 25) {
    label = "普通体重";
  }
  return `BMI ${bmi.toFixed(1)}（${label}）`;
}
