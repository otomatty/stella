// 01-q08 any をなくす ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/any
//
// 次の20個の関数は、引数と戻り値が any なので、型のチェックが効いていません。
// すべての any を正しい型に書き換えてください。中には、any のせいで見落とされているバグがあるものもあります。
// 型を直すと見つかるので、あわせて直すこと。文字列を + でつないでいるところは、テンプレートリテラルに書き換える。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 2つの数を足す
//     例: add(2, 3) → 5
export function add(a: any, b: any): any {
  return a + b;
}

// 問2 「こんにちは、◯◯さん」を返す
//     例: greet("山田") → "こんにちは、山田さん"
export function greet(name: any): any {
  return "こんにちは、" + name + "さん";
}

// 問3 文字数を返す
//     例: lengthOf("abc") → 3
export function lengthOf(text: any): any {
  return text.length;
}

// 問4 20歳以上なら true を返す
//     例: isAdult(20) → true
export function isAdult(age: any): any {
  return age >= 20;
}

// 問5 英字を大文字にする
//     例: shout("abc") → "ABC"
export function shout(text: any): any {
  return text.toUppercase();
}

// 問6 半分にした数を返す
//     例: half(9) → 4.5
export function half(n: any): any {
  return n / 2;
}

// 問7 前後の空白を取り除く
//     例: tidy("  hi  ") → "hi"
export function tidy(text: any): any {
  return text.trimm();
}

// 問8 長方形の面積を返す
//     例: area(3, 4) → 12
export function area(width: any, height: any): any {
  return width * height;
}

// 問9 金額を3桁ごとのカンマ区切りにし、「円」を付ける
//     例: priceText(1200) → "1,200円"
export function priceText(price: any): any {
  return price.toLocalString("ja-JP") + "円";
}

// 問10 空の文字列なら true を返す
//     例: isEmpty("") → true
export function isEmpty(text: any): any {
  return (text.length = 0);
}

// 問11 最初の1文字を返す
//     例: firstChar("abc") → "a"
export function firstChar(text: any): any {
  return text.charAt(0);
}

// 問12 3つの数を足す
//     例: sum3(1, 2, 3) → 6
export function sum3(a: any, b: any, c: any): any {
  return a + b + c;
}

// 問13 text を times 回つなげる
//     例: repeat("ha", 3) → "hahaha"
export function repeat(text: any, times: any): any {
  return text.repeat(times);
}

// 問14 2つの数のうち大きい方を返す
//     例: larger(3, 7) → 7
export function larger(a: any, b: any): any {
  return Math.max(a, b);
}

// 問15 text に word が含まれていれば true を返す
//     例: contains("TypeScript", "Script") → true
export function contains(text: any, word: any): any {
  return text.contain(word);
}

// 問16 文字列を数値に変える
//     例: toNumber("42") → 42
export function toNumber(text: any): any {
  return Number(text);
}

// 問17 件数の後ろに「件」を付ける
//     例: countLabel(3) → "3件"
export function countLabel(count: any): any {
  return count + "件";
}

// 問18 小数点以下を四捨五入する
//     例: roundOff(2.6) → 3
export function roundOff(n: any): any {
  return Math.round(n);
}

// 問19 2人の名前を「・」でつなぐ
//     例: joinNames("山田", "佐藤") → "山田・佐藤"
export function joinNames(a: any, b: any): any {
  return a + "・" + b;
}

// 問20 最後の1文字を返す
//     例: lastChar("abc") → "c"
export function lastChar(text: any): any {
  return text.slice(-1);
}
