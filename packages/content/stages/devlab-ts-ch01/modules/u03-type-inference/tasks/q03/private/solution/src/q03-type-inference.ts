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
