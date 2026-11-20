// 07-q01 typeof 型演算子
//
// 教材: https://typescriptbook.jp/reference/type-reuse/typeof-type-operator
//       https://typescriptbook.jp/reference/type-reuse/indexed-access-types
//
// 問題
// 値から型を作ると、値を直したときに型も一緒に変わるので、書き直し忘れがなくなります。
// 型の位置で typeof 値 と書くと、その値の型になります。定数 DEFAULT_CONFIG と THEMES は定義済みです。
//
// 1. 型 Config を、typeof を使って DEFAULT_CONFIG から作って export する
//
// 2. mergeConfig(partial) を書く。partial は host、port、debug をそれぞれ省略できるオブジェクト。
//    DEFAULT_CONFIG に partial を重ねた、新しい Config を返す（features はそのまま）
//
// 3. 型 Theme を、THEMES から作って export する（"light" | "dark" | "system" になる）
//    ヒント: (typeof THEMES)[number] は「配列の要素の型」を表す
//
// 4. isTheme(text) を書く。Theme のどれかなら true。戻り値の型は text is Theme
//
// 説明すること（答えは、この下に // のコメントで書く）
// - 型 Config を手で書いた場合と比べて、typeof で作ると何がうれしいか

export const DEFAULT_CONFIG = {
  host: "localhost",
  port: 3000,
  debug: false,
  features: { chat: true, video: false },
};

export const THEMES = ["light", "dark", "system"] as const;

export type Config = unknown;

export function mergeConfig() {}

export type Theme = unknown;

export function isTheme() {}
