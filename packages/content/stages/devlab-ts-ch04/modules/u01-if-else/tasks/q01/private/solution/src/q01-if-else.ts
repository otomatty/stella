// 問題
// 次の3つの関数を書いてください。引数と戻り値には型注釈を付けること。
//
// 1. grade(score)
//    90以上は "秀"、80以上は "優"、70以上は "良"、60以上は "可"、それ未満は "不可" を返す。
//    score が 0〜100 の整数でなければ Error を投げる。戻り値は "秀" | "優" | "良" | "可" | "不可"
//
// 2. shippingCost(weightKg, region)
//    送料を返す。region は "本州"、"北海道"、"沖縄" のどれか。
//    - 2kg 以下は 800円、5kg 以下は 1200円、それより重いと 2000円
//    - 北海道と沖縄は、さらに 500円を足す
//    - weightKg が 0 以下なら Error を投げる
//
// 3. ticketPrice(age, isWeekday)
//    入場料を返す。6歳未満は 0円、12歳以下は 500円、65歳以上は 800円、それ以外は 1500円。
//    平日は 100円引き。ただし 0円の人は 0円のまま
// if-else 文で分けます。短い場合は三項演算子でも構いません。
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
