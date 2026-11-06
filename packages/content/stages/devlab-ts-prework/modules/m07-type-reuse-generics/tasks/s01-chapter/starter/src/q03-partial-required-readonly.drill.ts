// 07-q03 Partial・Required・Readonly ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/partial
//       https://typescriptbook.jp/reference/type-reuse/utility-types/required
//       https://typescriptbook.jp/reference/type-reuse/utility-types/readonly
//
// 次の20問を解いてください。型 Options と Profile は定義済みです。
// Partial<T> はすべてを省略できる型、Required<T> はすべてを省略できない型、Readonly<T> はすべてを読み取り専用にした型。
// 型を書く問題は、プロパティを手で書き並べず、ユーティリティ型で作ること。関数は引数と戻り値に型注釈を付けること。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

export type Options = { size: number; color: string; bold: boolean };
export type Profile = { name: string; email?: string; age?: number };

export const DEFAULT_OPTIONS: Options = { size: 12, color: "black", bold: false };

// 問1 型 PartialOptions を Options から作る（すべて省略できる）
// ここに型 PartialOptions を書く

// 問2 型 RequiredProfile を Profile から作る（すべて省略できない）
// ここに型 RequiredProfile を書く

// 問3 型 ReadonlyOptions を Options から作る（すべて読み取り専用）
// ここに型 ReadonlyOptions を書く

// 問4 型 ReadonlyProfile を Profile から作る
// ここに型 ReadonlyProfile を書く

// 問5 一部だけ指定した Partial<Options> を受け取り、足りないところを DEFAULT_OPTIONS で補った Options を返す
//     例: withDefaults({ size: 20 }) → { size: 20, color: "black", bold: false }
export function withDefaults() {}

// 問6 options を patch（Partial<Options>）で上書きした、新しい Options を返す
//     例: patchOptions(options, { bold: true }) → bold だけ true
export function patchOptions() {}

// 問7 Profile の足りないところを、email は ""、age は 0 で補って Required<Profile> を返す
//     例: completeProfile({ name: "山田" }) → { name: "山田", email: "", age: 0 }
export function completeProfile() {}

// 問8 options のコピーを Object.freeze して、Readonly<Options> として返す
//     例: freezeOptions(options) → 書き換えられない Options
export function freezeOptions() {}

// 問9 email と age の両方があれば true。戻り値の型は profile is Required<Profile>
//     例: isComplete({ name: "山田" }) → false
export function isComplete() {}

// 問10 Partial<Options> のうち、値が入っているプロパティの数を返す
//     例: countSet({ size: 1, bold: false }) → 2
export function countSet() {}

// 問11 いくつかの Partial<Options> を、前から順に重ねた Partial<Options> を返す（残余引数で受け取る）
//     例: mergePatches({ size: 1 }, { size: 2, bold: true }) → { size: 2, bold: true }
export function mergePatches() {}

// 問12 Readonly<Profile> を受け取り、email だけを変えた新しい Readonly<Profile> を返す（元は変えない）
//     例: updateEmail(profile, "new@example.com").email → "new@example.com"
export function updateEmail() {}

// 問13 email を返す。なければ "email がありません" の Error を投げる
//     例: requireEmail({ name: "山田" }) → Error
export function requireEmail() {}

// 問14 a と b で値が違うプロパティだけを、b の値で持つ Partial<Options> を返す
//     例: diffOptions(a, { ...a, size: 20 }) → { size: 20 }
export function diffOptions() {}

// 問15 Readonly<Options> を受け取り、bold を反転した新しい Options を返す
//     例: toggleBold({ size: 12, color: "black", bold: false }).bold → true
export function toggleBold() {}

// 問16 Partial<Options> の size を返す。なければ fallback
//     例: sizeOr({}, 16) → 16
export function sizeOr() {}

// 問17 Readonly<Options> を "12px black" の形にする。bold が true なら後ろに " 太字" を付ける
//     例: describeOptions({ size: 12, color: "black", bold: true }) → "12px black 太字"
export function describeOptions() {}

// 問18 profile の足りないところを defaults（Required<Profile>）で補った Required<Profile> を返す
//     例: fillProfile({ name: "山田" }, { name: "", email: "-", age: 0 }) → { name: "山田", email: "-", age: 0 }
export function fillProfile() {}

// 問19 何も指定していない Partial<Options>（空のオブジェクト）を返す
//     例: emptyPatch() → {}
export function emptyPatch() {}

// 問20 options の、keys に並べたプロパティだけを DEFAULT_OPTIONS の値に戻した新しい Options を返す。keys は readonly (keyof Options)[]
//     例: resetKeys({ size: 20, color: "red", bold: true }, ["size"]) → { size: 12, color: "red", bold: true }
export function resetKeys() {}
