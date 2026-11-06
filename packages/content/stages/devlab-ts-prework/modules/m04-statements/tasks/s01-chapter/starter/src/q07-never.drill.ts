// 04-q07 never型と網羅性のチェック ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/never
//
// 次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。
// 関数 assertNever と、型 Fruit、Signal、Op、Shape、LogLevel は定義済みです。
// ユニオン型の値で場合分けするときは switch で書き、すべての case を書いたうえで default では assertNever(値) を返す。
// こうしておくと、型に新しい値が増えたときに、書き忘れた switch が型エラーで分かる。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

export function assertNever(value: never): never {
  throw new Error(`想定していない値です: ${JSON.stringify(value)}`);
}

export type Fruit = "apple" | "banana" | "cherry";
export type Signal = "red" | "yellow" | "green";
export type Op = "add" | "sub" | "mul";
export type Shape = { kind: "circle"; radius: number } | { kind: "square"; size: number };
export type LogLevel = "debug" | "info" | "warn" | "error";

// 問1 apple は "赤"、banana は "黄"、cherry は "赤" を返す
//     例: fruitColor("banana") → "黄"
export function fruitColor() {}

// 問2 apple は 150、banana は 100、cherry は 500 を返す
//     例: fruitPrice("cherry") → 500
export function fruitPrice() {}

// 問3 green → yellow → red → green の順に、次の色を返す
//     例: nextSignal("yellow") → "red"
export function nextSignal() {}

// 問4 green なら true、それ以外は false
//     例: canCross("green") → true
export function canCross() {}

// 問5 add は a + b、sub は a - b、mul は a × b を返す
//     例: applyOp("mul", 3, 4) → 12
export function applyOp() {}

// 問6 add は "+"、sub は "-"、mul は "×" を返す
//     例: opSymbol("sub") → "-"
export function opSymbol() {}

// 問7 面積を返す。円は Math.PI × 半径 × 半径
//     例: shapeArea({ kind: "square", size: 3 }) → 9
export function shapeArea() {}

// 問8 「円（半径 2）」「正方形（1辺 3）」を返す
//     例: shapeLabel({ kind: "circle", radius: 2 }) → "円（半径 2）"
export function shapeLabel() {}

// 問9 debug は 0、info は 1、warn は 2、error は 3 を返す
//     例: levelValue("warn") → 2
export function levelValue() {}

// 問10 "[DEBUG]"、"[INFO]"、"[WARN]"、"[ERROR]" を返す
//     例: levelPrefix("info") → "[INFO]"
export function levelPrefix() {}

// 問11 warn と error なら true、debug と info なら false
//     例: shouldNotify("warn") → true
export function shouldNotify() {}

// 問12 message の Error を投げる関数。戻り値の型は never（決して値を返さない）
//     例: fail("だめ") → Error "だめ"
export function fail() {}

// 問13 "ここには来ないはずです" の Error を投げる関数。引数はなし、戻り値の型は never
//     例: unreachable() → Error "ここには来ないはずです"
export function unreachable() {}

// 問14 文字列が Fruit のどれかなら、それを返す。違えば "果物ではありません: <text>" の Error を投げる
//     例: toFruit("apple") → "apple"
export function toFruit() {}

// 問15 ログの重要度ごとの数を { debug, info, warn, error } で返す（switch で数える）
//     例: countByLevel(["info", "warn", "info"]) → { debug: 0, info: 2, warn: 1, error: 0 }
export function countByLevel() {}

// 問16 apple は "🍎"、banana は "🍌"、cherry は "🍒" を返す
//     例: fruitEmoji("cherry") → "🍒"
export function fruitEmoji() {}

// 問17 信号の長さ（秒）を返す。green は 30、yellow は 3、red は 27
//     例: signalSeconds("yellow") → 3
export function signalSeconds() {}

// 問18 add は "足し算"、sub は "引き算"、mul は "掛け算" を返す
//     例: opName("add") → "足し算"
export function opName() {}

// 問19 大きさを k 倍した、新しい図形を返す
//     例: scaleShape({ kind: "square", size: 2 }, 3) → { kind: "square", size: 6 }
export function scaleShape() {}

// 問20 重要度の高い方を返す（debug < info < warn < error）。同じなら a
//     例: moreSevere("info", "error") → "error"
export function moreSevere() {}
