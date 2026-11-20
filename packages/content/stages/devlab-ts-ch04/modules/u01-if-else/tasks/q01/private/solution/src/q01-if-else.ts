export function grade(score: number): "秀" | "優" | "良" | "可" | "不可" {
  if (!Number.isInteger(score) || score < 0 || score > 100) {
    throw new Error("点数は0〜100の整数にしてください");
  }
  if (score >= 90) {
    return "秀";
  }
  if (score >= 80) {
    return "優";
  }
  if (score >= 70) {
    return "良";
  }
  if (score >= 60) {
    return "可";
  }
  return "不可";
}

export function shippingCost(weightKg: number, region: "本州" | "北海道" | "沖縄"): number {
  if (weightKg <= 0) {
    throw new Error("重さは0より大きくしてください");
  }
  let cost = 2000;
  if (weightKg <= 2) {
    cost = 800;
  } else if (weightKg <= 5) {
    cost = 1200;
  }
  return region === "本州" ? cost : cost + 500;
}

export function ticketPrice(age: number, isWeekday: boolean): number {
  let price = 1500;
  if (age < 6) {
    price = 0;
  } else if (age <= 12) {
    price = 500;
  } else if (age >= 65) {
    price = 800;
  }
  if (isWeekday && price > 0) {
    price -= 100;
  }
  return price;
}
