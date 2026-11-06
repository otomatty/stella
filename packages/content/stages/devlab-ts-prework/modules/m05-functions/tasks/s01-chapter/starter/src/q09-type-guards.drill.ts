// 05-q09 型ガード関数とアサーション関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/type-guard-functions
//       https://typescriptbook.jp/reference/functions/assertion-functions
//
// 次の20個の関数を書いてください。型 User、Admin、Pet は定義済みです。
// 「型ガード関数」は戻り値の型を value is string のように書く。true を返したとき、呼び出し側で value がその型に絞り込まれる。
// 「アサーション関数」は戻り値の型を asserts value is string のように書き、条件に合わなければ例外を投げる。
// テストは、戻り値の型が型ガードやアサーションになっているかも確かめる。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

export type User = { name: string; age: number };
export type Admin = User & { role: "admin" };
export type Pet = { kind: "dog"; bark: string } | { kind: "cat"; meow: string };

// 問1 【型ガード】文字列か。戻り値の型は value is string
//     例: isText("a") → true
export function isText() {}

// 問2 【型ガード】NaN でない数値か。戻り値の型は value is number
//     例: isNum(NaN) → false
export function isNum() {}

// 問3 【型ガード】真偽値か。戻り値の型は value is boolean
//     例: isBool(false) → true
export function isBool() {}

// 問4 【型ガード】すべての要素が文字列の配列か。戻り値の型は value is string[]
//     例: isStringArray(["a", "b"]) → true
export function isStringArray() {}

// 問5 【型ガード】string | null を受け取り、null でないか。戻り値の型は value is string
//     例: isPresent(null) → false
export function isPresent() {}

// 問6 【型ガード】number | undefined を受け取り、undefined でないか。戻り値の型は value is number
//     例: isDefinedNumber(0) → true
export function isDefinedNumber() {}

// 問7 【型ガード】null でないオブジェクトで、name が文字列、age が数値か。戻り値の型は value is User
//     例: isUser({ name: "山田", age: 30 }) → true
export function isUser() {}

// 問8 【型ガード】User | Admin を受け取り、Admin か（"role" in user で確かめる）。戻り値の型は user is Admin
//     例: isAdmin({ name: "山田", age: 30, role: "admin" }) → true
export function isAdmin() {}

// 問9 【型ガード】Pet が犬か。戻り値の型は pet is { kind: "dog"; bark: string }
//     例: isDog({ kind: "dog", bark: "ワン" }) → true
export function isDog() {}

// 問10 【型ガード】Pet が猫か。戻り値の型は pet is { kind: "cat"; meow: string }
//     例: isCat({ kind: "cat", meow: "ニャー" }) → true
export function isCat() {}

// 問11 unknown の配列から、文字列だけを集めた string[] を返す（filter に型ガード関数を渡すと、結果の型も絞り込まれる）
//     例: onlyStrings(["a", 1, "b"]) → ["a", "b"]
export function onlyStrings() {}

// 問12 (number | undefined)[] から undefined を除いた number[] を返す
//     例: definedOnly([1, undefined, 2]) → [1, 2]
export function definedOnly() {}

// 問13 unknown の配列の中で、User の形をしたものの数を返す（型ガード関数を自分で書いて使う）
//     例: countUsers([{ name: "山田", age: 30 }, "x"]) → 1
export function countUsers() {}

// 問14 【アサーション】文字列でなければ "文字列ではありません" の Error を投げる。戻り値の型は asserts value is string
//     例: assertText(1) → Error
export function assertText() {}

// 問15 【アサーション】string | undefined を受け取り、undefined なら "値がありません" の Error を投げる。戻り値の型は asserts value is string
//     例: assertDefined(undefined) → Error
export function assertDefined() {}

// 問16 【アサーション】User の形でなければ "User ではありません" の Error を投げる。戻り値の型は asserts value is User
//     例: assertUser({}) → Error
export function assertUser() {}

// 問17 User の形ならそれを、そうでなければ null を返す（型ガード関数を自分で書いて使う）
//     例: toUserOrNull("x") → null
export function toUserOrNull() {}

// 問18 【型ガード】「@」を含む文字列か。戻り値の型は value is string
//     例: isEmailLike("a@example.com") → true
export function isEmailLike() {}

// 問19 【型ガード】x と y が数値のオブジェクトか。戻り値の型は value is { x: number; y: number }
//     例: isPoint({ x: 1, y: 2 }) → true
export function isPoint() {}

// 問20 【型ガード】文字列が "red"、"green"、"blue" のどれかか。戻り値の型は value is "red" | "green" | "blue"
//     例: isColorName("red") → true
export function isColorName() {}
