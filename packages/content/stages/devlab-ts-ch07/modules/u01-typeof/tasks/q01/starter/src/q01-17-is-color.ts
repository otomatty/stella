// 問17 文字列が COLORS のどれかなら true。戻り値の型は text is (typeof COLORS)[number]
//     例: isColor("red") → true
// 定義済みの定数は書き換えません。
// 引数と戻り値に型注釈を付けます。

export const COLORS = ["red", "green", "blue"] as const;

export function isColor() {}
