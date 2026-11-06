// 問1
export function absValue(n: number): number {
  if (n < 0) {
    return -n;
  }
  return n;
}

// 問2
export function maxOf2(a: number, b: number): number {
  if (a >= b) {
    return a;
  }
  return b;
}

// 問3
export function passFail(score: number): "合格" | "不合格" {
  return score >= 60 ? "合格" : "不合格";
}

// 問4
export function bmiLabel(bmi: number): "やせ" | "普通" | "肥満" {
  if (bmi < 18.5) {
    return "やせ";
  }
  if (bmi < 25) {
    return "普通";
  }
  return "肥満";
}

// 問5
export function ageGroup(age: number): "子ども" | "大人" | "シニア" {
  if (age < 18) {
    return "子ども";
  }
  if (age < 65) {
    return "大人";
  }
  return "シニア";
}

// 問6
export function feeling(celsius: number): "寒い" | "ちょうどよい" | "暑い" {
  if (celsius < 15) {
    return "寒い";
  }
  if (celsius >= 28) {
    return "暑い";
  }
  return "ちょうどよい";
}

// 問7
export function signText(n: number): "正" | "負" | "ゼロ" {
  if (n > 0) {
    return "正";
  }
  if (n < 0) {
    return "負";
  }
  return "ゼロ";
}

// 問8
export function busFare(age: number): number {
  if (age < 6) {
    return 0;
  }
  if (age <= 12) {
    return 120;
  }
  return 240;
}

// 問9
export function discountRate(total: number): number {
  if (total >= 10000) {
    return 0.1;
  }
  if (total >= 5000) {
    return 0.05;
  }
  return 0;
}

// 問10
export function greetingFor(hour: number): "おはよう" | "こんにちは" | "こんばんは" {
  if (hour >= 5 && hour <= 10) {
    return "おはよう";
  }
  if (hour >= 11 && hour <= 17) {
    return "こんにちは";
  }
  return "こんばんは";
}

// 問11
export function compareText(a: number, b: number): string {
  if (a > b) {
    return "a のほうが大きい";
  }
  if (a < b) {
    return "b のほうが大きい";
  }
  return "同じ";
}

// 問12
export function quadrant(x: number, y: number): 0 | 1 | 2 | 3 | 4 {
  if (x === 0 || y === 0) {
    return 0;
  }
  if (x > 0) {
    return y > 0 ? 1 : 4;
  }
  return y > 0 ? 2 : 3;
}

// 問13
export function medalByTime(seconds: number): "金" | "銀" | "銅" | "参加賞" {
  if (seconds < 60) {
    return "金";
  }
  if (seconds < 90) {
    return "銀";
  }
  if (seconds < 120) {
    return "銅";
  }
  return "参加賞";
}

// 問14
export function waterState(celsius: number): "氷" | "水" | "水蒸気" {
  if (celsius <= 0) {
    return "氷";
  }
  if (celsius < 100) {
    return "水";
  }
  return "水蒸気";
}

// 問15
export function parkingFee(minutes: number): number {
  if (minutes <= 30) {
    return 0;
  }
  return Math.ceil(minutes / 30) * 200;
}

// 問16
export function windLevel(speed: number): "弱い" | "やや強い" | "強い" {
  if (speed < 5) {
    return "弱い";
  }
  if (speed < 10) {
    return "やや強い";
  }
  return "強い";
}

// 問17
export function pickLonger(a: string, b: string): string {
  return b.length > a.length ? b : a;
}

// 問18
export function parityLabel(n: number): "偶数" | "奇数" {
  return n % 2 === 0 ? "偶数" : "奇数";
}

// 問19
export function taxiFare(fare: number, hour: number): number {
  if (hour >= 22 || hour < 5) {
    return Math.round(fare * 1.2);
  }
  return fare;
}

// 問20
export function stockStatus(stock: number): "在庫あり" | "残りわずか" | "在庫なし" {
  if (stock === 0) {
    return "在庫なし";
  }
  if (stock <= 5) {
    return "残りわずか";
  }
  return "在庫あり";
}
