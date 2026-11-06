// 04-q01 if-else文
//
// 教材: https://typescriptbook.jp/reference/statements/if-else
//       https://typescriptbook.jp/reference/statements/ternary-operator
//
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

export function grade() {}

export function shippingCost() {}

export function ticketPrice() {}
