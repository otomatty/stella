// 02-q02 オプションプロパティと readonly ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/optional-property
//       https://typescriptbook.jp/reference/values-types-variables/object/readonly-property
//
// 次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。
// なくてもよいプロパティは nickname?: string のように ? を付ける。書き換えさせないプロパティには readonly を付ける。
// オプションプロパティの値は undefined かもしれないので、?? や !== undefined で扱う。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

// 問1 { name, nickname? } を受け取り、nickname があれば nickname、なければ name を使って「こんにちは、◯◯さん」を返す
//     例: greetUser({ name: "山田太郎", nickname: "たろう" }) → "こんにちは、たろうさん"
export function greetUser() {}

// 問2 { email? } に email があれば true
//     例: hasEmail({ email: "a@example.com" }) → true
export function hasEmail() {}

// 問3 { email? } の email を返す。なければ「（未登録）」
//     例: emailText({}) → "（未登録）"
export function emailText() {}

// 問4 { age? } を「◯歳」にする。age がなければ「年齢不明」
//     例: ageText({ age: 30 }) → "30歳"
export function ageText() {}

// 問5 { color? } の color を返す。なければ "black"
//     例: colorOf({}) → "black"
export function colorOf() {}

// 問6 { perPage? } の perPage を返す。なければ 20
//     例: perPageOf({}) → 20
export function perPageOf() {}

// 問7 id と title から、ToDo { id（読み取り専用）, title, done } を作る。done は false
//     例: createTodo(1, "買い物") → { id: 1, title: "買い物", done: false }
export function createTodo() {}

// 問8 ToDo { id（読み取り専用）, title, done } の done を true にした、新しい ToDo を返す（元は変えない）
//     例: completeTodo({ id: 1, title: "買い物", done: false }) → { id: 1, title: "買い物", done: true }
export function completeTodo() {}

// 問9 { first, middle?, last } をつなぐ。middle があれば「first middle last」、なければ「first last」
//     例: nameWithMiddle({ first: "John", middle: "F", last: "Kennedy" }) → "John F Kennedy"
export function nameWithMiddle() {}

// 問10 { name?, email? } の両方がそろっていれば true
//     例: isComplete({ name: "山田" }) → false
export function isComplete() {}

// 問11 { a?, b?, c? } のうち、値があるプロパティの数を返す
//     例: countFilled({ a: "x", c: "z" }) → 2
export function countFilled() {}

// 問12 { price, coupon? } の支払額（price - coupon）を返す。coupon がなければ 0円引き
//     例: payAmount({ price: 1000, coupon: 200 }) → 800
export function payAmount() {}

// 問13 { city, building? } を、building があれば「city building」、なければ「city」にする
//     例: addressText({ city: "渋谷区", building: "渋谷ビル" }) → "渋谷区 渋谷ビル"
export function addressText() {}

// 問14 x と y から、どちらも読み取り専用の座標 { x, y } を作る
//     例: frozenPoint(1, 2) → { x: 1, y: 2 }
export function frozenPoint() {}

// 問15 読み取り専用の座標 { x, y } の x を1増やした、新しい座標を返す
//     例: moveRight({ x: 1, y: 2 }) → { x: 2, y: 2 }
export function moveRight() {}

// 問16 { title, subtitle? } を、subtitle があれば「title: subtitle」、なければ「title」にする
//     例: titleText({ title: "入門", subtitle: "TypeScript" }) → "入門: TypeScript"
export function titleText() {}

// 問17 { timeoutSeconds? } をミリ秒にして返す。なければ 30 秒とみなす
//     例: timeoutMs({ timeoutSeconds: 5 }) → 5000
export function timeoutMs() {}

// 問18 { name, memberId? } に memberId がなければ true（ゲスト）
//     例: isGuest({ name: "山田" }) → true
export function isGuest() {}

// 問19 { id, label? } の label を返す。なければ「#id」
//     例: labelOf({ id: 7 }) → "#7"
export function labelOf() {}

// 問20 { darkMode（読み取り専用）, fontSize? } を「ダーク / 16px」の形にする。darkMode が false なら「ライト」、fontSize がなければ 16
//     例: settingText({ darkMode: true }) → "ダーク / 16px"
export function settingText() {}
