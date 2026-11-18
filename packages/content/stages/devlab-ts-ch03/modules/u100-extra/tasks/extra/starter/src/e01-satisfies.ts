// 03-e01 発展問題 satisfies 演算子
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/satisfies
//
// 問題
// 画面の一覧 ROUTES は、型注釈 { [name: string]: Route } を付けて宣言されています。
// このせいで、ROUTES のキー名（home、settings、admin）が型から消え、
// RouteName が string | number になってしまっています。
//
// 1. ROUTES の型注釈をやめ、satisfies を使って書き直す。
//    { [name: string]: Route } の形になっているかは確かめつつ、キー名が型に残るようにする
//    （RouteName が "home" | "settings" | "admin" になる。RouteName の書き方は07章で扱う）
//
// 2. pathOf(name) を書く。name の画面の path を返す。引数は RouteName
//
// 3. protectedPaths() を書く。auth が true の画面の path を、ROUTES に書いた順に配列で返す
//
// 説明すること（答えは、この下に // のコメントで書く）
// - 型注釈で書いた場合と satisfies で書いた場合で、ROUTES の型はどう違うか

export type Route = { path: string; auth: boolean };

export const ROUTES: { [name: string]: Route } = {
  home: { path: "/", auth: false },
  settings: { path: "/settings", auth: true },
  admin: { path: "/admin", auth: true },
};

export type RouteName = keyof typeof ROUTES;

export function pathOf() {}

export function protectedPaths() {}
